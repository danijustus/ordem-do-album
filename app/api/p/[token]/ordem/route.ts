import { NextResponse } from "next/server";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin } from "@/lib/supabase";

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
      { erro: "A ordem já foi aprovada." },
      { status: 409 }
    );
  }
  const { ordem } = await req.json().catch(() => ({ ordem: [] }));
  if (!Array.isArray(ordem)) {
    return NextResponse.json({ erro: "Formato inválido" }, { status: 400 });
  }

  // Atualiza a posição de cada foto conforme a sequência recebida.
  await Promise.all(
    ordem.map((fotoId: string, indice: number) =>
      supabaseAdmin
        .from("fotos")
        .update({ ordem: indice })
        .eq("id", fotoId)
        .eq("projeto_id", projeto.id)
    )
  );
  return NextResponse.json({ ok: true });
}
