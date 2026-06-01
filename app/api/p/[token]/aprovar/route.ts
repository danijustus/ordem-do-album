import { NextResponse } from "next/server";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin } from "@/lib/supabase";
import { notificarAprovacao } from "@/lib/email";

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
    return NextResponse.json({ ok: true, jaAprovado: true });
  }

  // Garante que a ordem final seja salva junto da aprovação.
  const { ordem } = await req.json().catch(() => ({ ordem: [] }));
  if (Array.isArray(ordem) && ordem.length > 0) {
    await Promise.all(
      ordem.map((fotoId: string, indice: number) =>
        supabaseAdmin
          .from("fotos")
          .update({ ordem: indice })
          .eq("id", fotoId)
          .eq("projeto_id", projeto.id)
      )
    );
  }

  await supabaseAdmin
    .from("projetos")
    .update({ status: "aprovado", aprovado_em: new Date().toISOString() })
    .eq("id", projeto.id);

  // Aviso por e-mail (melhor esforço — não bloqueia se falhar).
  await notificarAprovacao({ projetoNome: projeto.nome, projetoId: projeto.id });

  return NextResponse.json({ ok: true });
}
