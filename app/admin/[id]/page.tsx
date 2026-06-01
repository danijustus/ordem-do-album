"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { publicUrl, thumbUrl } from "@/lib/storage";

type Foto = {
  id: string;
  storage_path: string;
  nome_original: string | null;
  ordem: number;
};

type Projeto = {
  id: string;
  nome: string;
  token: string;
  status: "aberto" | "aprovado";
  aprovado_em: string | null;
};

function extensao(nome: string): string {
  const m = nome.match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : ".jpg";
}

function nomeRenomeado(foto: Foto, indice: number): string {
  const numero = String(indice + 1).padStart(3, "0");
  const base = (foto.nome_original ?? "foto").replace(/\.[a-zA-Z0-9]+$/, "");
  const seguro = base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 40);
  return `${numero}_${seguro}${extensao(foto.nome_original ?? "")}`;
}

export default function DetalheProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<{ feito: number; total: number } | null>(
    null
  );
  const [copiado, setCopiado] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/projetos/${id}`);
      if (r.status === 401) {
        setErro("Sessão expirada. Volte e entre novamente.");
        setCarregando(false);
        return;
      }
      if (!r.ok) {
        setErro("Projeto não encontrado.");
        setCarregando(false);
        return;
      }
      const d = await r.json();
      setProjeto(d.projeto);
      setFotos(d.fotos ?? []);
      setCarregando(false);
    })();
  }, [id]);

  function linkCliente() {
    return `${window.location.origin}/album/${projeto?.token}`;
  }

  async function copiar() {
    await navigator.clipboard.writeText(linkCliente());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function reabrir() {
    if (
      !confirm(
        "Reabrir o álbum para edição? A cliente poderá arrastar e mudar a ordem novamente, e precisará aprovar de novo no final."
      )
    )
      return;
    setReabrindo(true);
    const r = await fetch(`/api/projetos/${id}/reabrir`, { method: "POST" });
    setReabrindo(false);
    if (r.ok) {
      setProjeto((p) =>
        p ? { ...p, status: "aberto", aprovado_em: null } : p
      );
    }
  }

  async function baixarZip() {
    if (fotos.length === 0) return;
    setErro(null);
    setBaixando({ feito: 0, total: fotos.length });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < fotos.length; i++) {
        const resp = await fetch(publicUrl(fotos[i].storage_path));
        if (!resp.ok) throw new Error(`Falha ao baixar foto ${i + 1}`);
        const blob = await resp.blob();
        zip.file(nomeRenomeado(fotos[i], i), blob);
        setBaixando({ feito: i + 1, total: fotos.length });
      }
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(conteudo, `${nomeArquivoProjeto()}.zip`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar o ZIP.");
    }
    setBaixando(null);
  }

  function baixarCsv() {
    const linhas = [
      "ordem,arquivo_renomeado,nome_original",
      ...fotos.map((f, i) =>
        [i + 1, nomeRenomeado(f, i), f.nome_original ?? ""]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    baixarBlob(
      new Blob(["﻿" + linhas.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `${nomeArquivoProjeto()}.csv`
    );
  }

  function nomeArquivoProjeto() {
    return (projeto?.nome ?? "album")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  function baixarBlob(blob: Blob, nome: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (carregando) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-neutral-500">
        Carregando…
      </main>
    );
  }

  if (erro && !projeto) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-red-600">{erro}</p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Voltar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="text-sm text-neutral-500 hover:text-foreground"
        >
          ← Voltar
        </Link>
        <span className="marca text-lg">Lembra?</span>
      </div>

      <header className="mb-6 mt-3">
        <h1 className="text-3xl">{projeto?.nome}</h1>
        <p className="mt-1 text-sm">
          {projeto?.status === "aprovado" ? (
            <span className="font-medium text-green-600">✓ Ordem aprovada</span>
          ) : (
            <span className="text-amber-600">
              Aguardando aprovação da cliente
            </span>
          )}{" "}
          · {fotos.length} foto{fotos.length === 1 ? "" : "s"}
        </p>
        {projeto?.status === "aprovado" && (
          <button
            onClick={reabrir}
            disabled={reabrindo}
            className="mt-3 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60"
          >
            {reabrindo ? "Reabrindo…" : "Reabrir para edição"}
          </button>
        )}
      </header>

      <div className="mb-6 rounded border border-border bg-white p-4">
        <p className="mb-2 text-sm font-medium">Link da cliente</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs text-neutral-700">
            {typeof window !== "undefined" ? linkCliente() : ""}
          </code>
          <button
            onClick={copiar}
            className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
          <a
            href={linkCliente()}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            Abrir
          </a>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={baixarZip}
          disabled={fotos.length === 0 || !!baixando}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {baixando
            ? `Gerando ZIP… ${baixando.feito}/${baixando.total}`
            : "Baixar ZIP (renomeado)"}
        </button>
        <button
          onClick={baixarCsv}
          disabled={fotos.length === 0}
          className="rounded border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Baixar CSV
        </button>
        {projeto?.status !== "aprovado" && fotos.length > 0 && (
          <span className="text-xs text-neutral-400">
            Você pode baixar a qualquer momento, mas a ordem só é definitiva
            após a aprovação.
          </span>
        )}
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-12 text-center text-neutral-400">
          Nenhuma foto enviada ainda.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {fotos.map((f, i) => (
            <div
              key={f.id}
              className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <span className="absolute left-1 top-1 rounded bg-rosa px-1.5 py-0.5 text-xs font-semibold text-white">
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(f.storage_path)}
                alt={f.nome_original ?? "foto"}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src.endsWith(".thumb.jpg")) {
                    img.src = img.src.slice(0, -".thumb.jpg".length);
                  }
                }}
                className="aspect-square w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
