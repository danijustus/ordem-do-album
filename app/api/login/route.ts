import { NextResponse } from "next/server";
import { checkPassword, createSession, destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  const { senha } = await req.json().catch(() => ({ senha: "" }));
  if (!checkPassword(String(senha ?? ""))) {
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
