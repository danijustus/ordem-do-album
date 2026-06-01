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
  const { storage_path, nome_original } = await req
    .json()
    .catch(() => ({ storage_path: "", nome_original: "" }));
  if (!storage_path) {
    return NextResponse.json({ erro: "storage_path ausente" }, { status: 400 });
  }

  // Próxima posição na ordem.
  const { data: ultima } = await supabaseAdmin
    .from("fotos")
    .select("ordem")
    .eq("projeto_id", projeto.id)
    .order("ordem", { ascending: false })
    .limit(1);
  const proximaOrdem = (ultima?.[0]?.ordem ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("fotos")
    .insert({
      projeto_id: projeto.id,
      storage_path,
      nome_original: nome_original ?? null,
      ordem: proximaOrdem,
    })
    .select("id, storage_path, nome_original, ordem")
    .single();
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ foto: data });
}
