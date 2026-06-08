"use client";

import { use, useEffect, useRef, useState } from "react";
import SortableGrid, { type Item } from "@/components/SortableGrid";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { thumbUrl, BUCKET } from "@/lib/storage";
import { gerarThumbnail } from "@/lib/thumb";

type Foto = {
  id: string;
  storage_path: string;
  nome_original: string | null;
  ordem: number;
};

type Estado = {
  nome: string;
  status: "aberto" | "aprovado";
} | null;

export default function PaginaCliente({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [projeto, setProjeto] = useState<Estado>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(
    null
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [emailCliente, setEmailCliente] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const aprovado = projeto?.status === "aprovado";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente.trim());

  async function carregar() {
    const r = await fetch(`/api/p/${token}`);
    if (!r.ok) {
      setErro("Link inválido ou expirado.");
      setCarregando(false);
      return;
    }
    const d = await r.json();
    setProjeto(d.projeto);
    setItens(
      (d.fotos as Foto[]).map((f) => ({
        id: f.id,
        url: thumbUrl(f.storage_path),
        nome: f.nome_original ?? "foto",
      }))
    );
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function enviarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setEnviando(true);
    setErro(null);
    const lista = Array.from(files);
    setProgresso({ feito: 0, total: lista.length });
    const novos: Item[] = [];

    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      try {
        const r = await fetch(`/api/p/${token}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomeArquivo: file.name }),
        });
        if (!r.ok) throw new Error((await r.json()).erro ?? "Falha");
        const { path, token: uploadToken, thumbPath, thumbToken } =
          await r.json();

        const up = await supabaseBrowser.storage
          .from(BUCKET)
          .uploadToSignedUrl(path, uploadToken, file);
        if (up.error) throw up.error;

        // Miniatura: melhor esforço. Se falhar, a grade cai no original.
        if (thumbPath && thumbToken) {
          const mini = await gerarThumbnail(file);
          if (mini) {
            await supabaseBrowser.storage
              .from(BUCKET)
              .uploadToSignedUrl(thumbPath, thumbToken, mini, {
                contentType: "image/jpeg",
              });
          }
        }

        const reg = await fetch(`/api/p/${token}/fotos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storage_path: path, nome_original: file.name }),
        });
        if (!reg.ok) throw new Error((await reg.json()).erro ?? "Falha");
        const { foto } = await reg.json();
        novos.push({
          id: foto.id,
          url: thumbUrl(foto.storage_path),
          nome: foto.nome_original ?? "foto",
        });
      } catch (e) {
        setErro(
          `Erro ao enviar "${file.name}": ${e instanceof Error ? e.message : "desconhecido"}`
        );
      }
      setProgresso({ feito: i + 1, total: lista.length });
    }

    setItens((prev) => [...prev, ...novos]);
    setEnviando(false);
    setProgresso(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function salvarOrdem() {
    setSalvando(true);
    setSalvo(false);
    await fetch(`/api/p/${token}/ordem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordem: itens.map((i) => i.id) }),
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  async function aprovar() {
    if (!emailOk) return;
    setConfirmando(false);
    setSalvando(true);
    const r = await fetch(`/api/p/${token}/aprovar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ordem: itens.map((i) => i.id),
        email: emailCliente.trim(),
      }),
    });
    setSalvando(false);
    if (r.ok) {
      setProjeto((p) => (p ? { ...p, status: "aprovado" } : p));
    }
  }

  async function removerFoto(id: string) {
    const anterior = itens;
    setItens((prev) => prev.filter((i) => i.id !== id));
    const r = await fetch(`/api/p/${token}/fotos/${id}`, { method: "DELETE" });
    if (!r.ok) setItens(anterior);
  }

  if (carregando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center text-neutral-500">
        Carregando…
      </main>
    );
  }

  if (erro && !projeto) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center text-red-600">
        {erro}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-baseline gap-2">
        <span className="marca text-2xl">Lembra?</span>
        <span className="text-xs uppercase tracking-widest text-neutral-400">
          Ordem do álbum
        </span>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl">{projeto?.nome}</h1>
      </header>

      {!aprovado && (
        <div className="mb-6 rounded border border-border bg-muted/60 px-4 py-3 text-sm leading-relaxed text-neutral-600">
          <strong className="font-medium text-foreground">Como funciona:</strong>{" "}
          arraste as fotos para a ordem que quiser. Você pode salvar e voltar
          quando quiser — nada se perde. Quando estiver do seu jeito, clique em{" "}
          <strong className="font-medium text-foreground">
            Aprovar ordem final
          </strong>{" "}
          (faça isso só no fim, pois trava a ordem).
        </div>
      )}

      {aprovado && (
        <div className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm leading-relaxed text-green-800">
          <strong className="font-medium">✓ Ordem aprovada. Obrigada!</strong>
          <br />
          O próximo passo é nosso: vamos montar o layout do seu álbum com as
          fotos nesta ordem e enviar para a sua aprovação final. Se precisar
          ajustar a ordem antes disso, fale com a fotógrafa para reabrir o
          álbum.
        </div>
      )}

      {erro && projeto && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {!aprovado && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={enviando}
            onChange={(e) => enviarArquivos(e.target.files)}
            className="hidden"
            id="upload"
          />
          <label
            htmlFor="upload"
            className={`cursor-pointer rounded bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
              enviando ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {enviando ? "Enviando…" : "+ Adicionar fotos"}
          </label>
          {progresso && (
            <span className="text-sm text-neutral-500">
              {progresso.feito} de {progresso.total} enviadas
            </span>
          )}
        </div>
      )}

      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-16 text-center text-neutral-400">
          Nenhuma foto ainda. Use “Adicionar fotos” para começar.
        </p>
      ) : (
        <SortableGrid
          itens={itens}
          onReordenar={aprovado ? undefined : setItens}
          onRemover={aprovado ? undefined : removerFoto}
        />
      )}

      {!aprovado && itens.length > 0 && (
        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
          <button
            onClick={salvarOrdem}
            disabled={salvando}
            className="rounded border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar progresso"}
          </button>
          {salvo && <span className="text-sm text-green-600">✓ Salvo</span>}
          <button
            onClick={() => setConfirmando(true)}
            disabled={salvando}
            className="ml-auto rounded bg-rosa px-5 py-2 text-sm font-medium text-white transition hover:bg-rosa-escuro disabled:opacity-60"
          >
            Aprovar ordem final
          </button>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-2xl">
            <h2 className="text-2xl">Aprovar a ordem do álbum?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Você confirma que a sequência das fotos está do jeito que quer?
              Depois de aprovar, a ordem fica salva e não poderá mais ser
              alterada.
            </p>
            <div className="mt-4">
              <label
                htmlFor="email-cliente"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Seu e-mail
              </label>
              <input
                id="email-cliente"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-rosa focus:outline-none"
                autoFocus
              />
              <p className="mt-1 text-xs text-neutral-500">
                Enviaremos a confirmação e os próximos passos para este e-mail.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmando(false)}
                disabled={salvando}
                className="rounded border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                Voltar e revisar
              </button>
              <button
                onClick={aprovar}
                disabled={salvando || !emailOk}
                className="rounded bg-rosa px-5 py-2 text-sm font-medium text-white transition hover:bg-rosa-escuro disabled:opacity-60"
              >
                {salvando ? "Aprovando…" : "Sim, aprovar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
