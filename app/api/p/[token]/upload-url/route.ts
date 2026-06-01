import { NextResponse } from "next/server";
import crypto from "crypto";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin, BUCKET } from "@/lib/supabase";

function sanitizarNome(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return limpo || "foto";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const projeto = await getProjetoByToken(token);
  if (!projeto) {
    return NextResponse.json({ erro: "Link inválido" }, { status: 404 });
  }
  if (projeto.status === "aprovado") {
    return NextResponse.json(
      { erro: "A ordem já foi aprovada. Não é possível adicionar fotos." },
      { status: 409 }
    );
  }
  const { nomeArquivo } = await req.json().catch(() => ({ nomeArquivo: "" }));
  const seguro = sanitizarNome(String(nomeArquivo ?? "foto"));
  const path = `${projeto.id}/${crypto.randomBytes(6).toString("hex")}_${seguro}`;
  const thumbPath = `${path}.thumb.jpg`;

  const original = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (original.error || !original.data) {
    return NextResponse.json(
      { erro: original.error?.message ?? "Falha ao preparar upload" },
      { status: 500 }
    );
  }

  // Miniatura: melhor esforço. Se falhar, o upload do original segue.
  const thumb = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(thumbPath);

  return NextResponse.json({
    path: original.data.path,
    token: original.data.token,
    thumbPath: thumb.data?.path ?? null,
    thumbToken: thumb.data?.token ?? null,
  });
}
