import { supabaseAdmin } from "@/lib/supabase";

export type Projeto = {
  id: string;
  nome: string;
  token: string;
  status: "aberto" | "aprovado";
  criado_em: string;
  aprovado_em: string | null;
};

export async function getProjetoByToken(
  token: string
): Promise<Projeto | null> {
  const { data } = await supabaseAdmin
    .from("projetos")
    .select("id, nome, token, status, criado_em, aprovado_em")
    .eq("token", token)
    .single();
  return (data as Projeto) ?? null;
}
