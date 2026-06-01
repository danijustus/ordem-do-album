import { NextResponse } from "next/server";
import { getProjetoByToken } from "@/lib/projeto";
import { supabaseAdmin, BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string; fotoId: string }> }
) {
  const { token, fotoId } = await params;
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
  const { data: foto } = await supabaseAdmin
    .from("fotos")
    .select("id, storage_path")
    .eq("id", fotoId)
    .eq("projeto_id", projeto.id)
    .single();
  if (!foto) {
    return NextResponse.json({ erro: "Foto não encontrada" }, { status: 404 });
  }
  await supabaseAdmin.storage.from(BUCKET).remove([foto.storage_path]);
  await supabaseAdmin.from("fotos").delete().eq("id", foto.id);
  return NextResponse.json({ ok: true });
}
