"use client";

import { createClient } from "@supabase/supabase-js";

// Cliente do navegador: usa a chave pública (anon). Seguro expor.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://placeholder.invalid",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
  { auth: { persistSession: false } }
);
