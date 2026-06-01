// Helpers seguros para usar no navegador (só usam a URL pública).
export const BUCKET = "fotos";

export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

// URL da miniatura (leve, para exibir na grade). Convenção: original + ".thumb.jpg".
export function thumbUrl(path: string): string {
  return publicUrl(`${path}.thumb.jpg`);
}
