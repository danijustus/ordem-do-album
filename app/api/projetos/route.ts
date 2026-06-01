import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthed } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { data: projetos, error } = await supabaseAdmin
    .from("projetos")
    .select("id, nome, token, status, criado_em, aprovado_em")
    .order("criado_em", { ascending: false });
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  // Conta de fotos por projeto.
  const ids = (projetos ?? []).map((p) => p.id);
  const contagem: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: fotos } = await supabaseAdmin
      .from("fotos")
      .select("projeto_id")
      .in("projeto_id", ids);
    for (const f of fotos ?? []) {
      contagem[f.projeto_id] = (contagem[f.projeto_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    projetos: (projetos ?? []).map((p) => ({
      ...p,
      total_fotos: contagem[p.id] ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { nome } = await req.json().catch(() => ({ nome: "" }));
  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) {
    return NextResponse.json({ erro: "Informe o nome do projeto" }, { status: 400 });
  }
  const token = crypto.randomBytes(9).toString("base64url");
  const { data, error } = await supabaseAdmin
    .from("projetos")
    .insert({ nome: nomeLimpo, token })
    .select("id, nome, token, status")
    .single();
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ projeto: data });
}
