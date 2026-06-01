import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "ordem_sessao";

function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret-trocar-em-producao";
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): boolean {
  if (!signed) return false;
  const i = signed.lastIndexOf(".");
  if (i < 0) return false;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expected = crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("hex");
  try {
    return (
      value === "admin" &&
      crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}

export function checkPassword(senha: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(senha);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, sign("admin"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  return verify(c.get(COOKIE)?.value);
}
