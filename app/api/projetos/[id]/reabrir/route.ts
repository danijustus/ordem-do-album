import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Destrava um álbum aprovado para que a cliente possa editar de novo.
// Só a fotógrafa (admin) pode fazer isso.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("projetos")
    .update({ status: "aberto", aprovado_em: null })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
