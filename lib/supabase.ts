import { createClient } from "@supabase/supabase-js";

// Cliente de servidor com permissão total (service role).
// NUNCA importe este arquivo em componentes de cliente ("use client").
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Mensagem clara em vez de erro críptico quando faltam variáveis.
  console.warn(
    "[Supabase] Faltam variáveis NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY (.env.local)."
  );
}

// Placeholder evita que a biblioteca quebre durante o build quando as
// variáveis ainda não existem. Em produção, os valores reais são usados.
export const supabaseAdmin = createClient(
  url || "http://placeholder.invalid",
  serviceKey || "placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const BUCKET = "fotos";
