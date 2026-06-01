"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Projeto = {
  id: string;
  nome: string;
  token: string;
  status: "aberto" | "aprovado";
  total_fotos: number;
  criado_em: string;
};

export default function Admin() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function carregar() {
    const r = await fetch("/api/projetos");
    if (r.status === 401) {
      setAutenticado(false);
      return;
    }
    setAutenticado(true);
    const d = await r.json();
    setProjetos(d.projetos ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErroLogin(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (r.ok) {
      setSenha("");
      carregar();
    } else {
      setErroLogin("Senha incorreta.");
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setCriando(true);
    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    });
    setCriando(false);
    if (r.ok) {
      setNovoNome("");
      carregar();
    }
  }

  function linkCliente(token: string) {
    return `${window.location.origin}/album/${token}`;
  }

  async function copiar(token: string) {
    await navigator.clipboard.writeText(linkCliente(token));
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  }

  if (autenticado === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-neutral-500">
        Carregando…
      </main>
    );
  }

  if (!autenticado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <span className="marca mb-1 text-3xl">Lembra?</span>
        <p className="mb-6 text-sm text-neutral-500">
          Ordem do Álbum · área da fotógrafa
        </p>
        <form onSubmit={entrar} className="space-y-3">
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            className="w-full rounded border border-border px-3 py-2 text-sm focus:border-rosa focus:outline-none"
            autoFocus
          />
          {erroLogin && <p className="text-sm text-red-600">{erroLogin}</p>}
          <button
            type="submit"
            className="w-full rounded bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <span className="marca text-3xl">Lembra?</span>
          <p className="text-xs uppercase tracking-widest text-neutral-400">
            Ordem do álbum · seus projetos
          </p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/login", { method: "DELETE" });
            setAutenticado(false);
          }}
          className="text-sm text-neutral-500 hover:text-foreground"
        >
          Sair
        </button>
      </header>

      <form
        onSubmit={criar}
        className="mb-8 flex gap-2 rounded border border-border bg-white p-3"
      >
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do projeto (ex: Álbum Noruega — Ju)"
          className="flex-1 rounded border border-border px-3 py-2 text-sm focus:border-rosa focus:outline-none"
        />
        <button
          type="submit"
          disabled={criando}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {criando ? "Criando…" : "Criar"}
        </button>
      </form>

      {projetos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-12 text-center text-neutral-400">
          Nenhum projeto ainda. Crie o primeiro acima.
        </p>
      ) : (
        <ul className="space-y-3">
          {projetos.map((p) => (
            <li
              key={p.id}
              className="rounded border border-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/${p.id}`}
                    className="text-lg hover:text-rosa"
                  >
                    {p.nome}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {p.total_fotos} foto{p.total_fotos === 1 ? "" : "s"} ·{" "}
                    {p.status === "aprovado" ? (
                      <span className="font-medium text-green-600">
                        Aprovado
                      </span>
                    ) : (
                      <span className="text-amber-600">Aguardando</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => copiar(p.token)}
                    className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted"
                  >
                    {copiado === p.token ? "✓ Copiado" : "Copiar link"}
                  </button>
                  <Link
                    href={`/admin/${p.id}`}
                    className="rounded bg-foreground px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
