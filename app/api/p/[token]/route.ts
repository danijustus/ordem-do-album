import { NextResponse } from "next/server";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const projeto = await getProjetoByToken(token);
  if (!projeto) {
    return NextResponse.json({ erro: "Link inválido" }, { status: 404 });
  }
  const { data: fotos } = await supabaseAdmin
    .from("fotos")
    .select("id, storage_path, nome_original, ordem")
    .eq("projeto_id", projeto.id)
    .order("ordem", { ascending: true });
  return NextResponse.json({
    projeto: {
      nome: projeto.nome,
      status: projeto.status,
      aprovado_em: projeto.aprovado_em,
    },
    fotos: fotos ?? [],
  });
}
