import { NextResponse } from "next/server";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin } from "@/lib/supabase";
import { notificarAprovacao, confirmarParaCliente } from "@/lib/email";

function emailValido(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
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
    return NextResponse.json({ ok: true, jaAprovado: true });
  }

  // Garante que a ordem final seja salva junto da aprovação.
  const { ordem, email } = await req
    .json()
    .catch(() => ({ ordem: [], email: "" }));
  const clienteEmail = emailValido(email) ? String(email).trim() : null;
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

  // Avisos por e-mail (melhor esforço — não bloqueiam se falharem).
  await notificarAprovacao({
    projetoNome: projeto.nome,
    projetoId: projeto.id,
    clienteEmail,
  });
  if (clienteEmail) {
    await confirmarParaCliente({
      email: clienteEmail,
      projetoNome: projeto.nome,
    });
  }

  return NextResponse.json({ ok: true });
}
