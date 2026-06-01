import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { supabaseAdmin, BUCKET } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { data: projeto, error } = await supabaseAdmin
    .from("projetos")
    .select("id, nome, token, status, criado_em, aprovado_em")
    .eq("id", id)
    .single();
  if (error || !projeto) {
    return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });
  }
  const { data: fotos } = await supabaseAdmin
    .from("fotos")
    .select("id, storage_path, nome_original, ordem")
    .eq("projeto_id", id)
    .order("ordem", { ascending: true });
  return NextResponse.json({ projeto, fotos: fotos ?? [] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { data: fotos } = await supabaseAdmin
    .from("fotos")
    .select("storage_path")
    .eq("projeto_id", id);
  const paths = (fotos ?? []).map((f) => f.storage_path);
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(BUCKET).remove(paths);
  }
  await supabaseAdmin.from("projetos").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
