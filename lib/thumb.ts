"use client";

// Gera uma miniatura JPEG no navegador (lado do cliente), respeitando a
// orientação EXIF da foto. Retorna null se não for possível (formato não
// suportado, etc.) — nesse caso o upload do original segue normalmente.
export async function gerarThumbnail(
  file: File,
  maxLado = 600,
  qualidade = 0.82
): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", qualidade)
    );
  } catch {
    return null;
  }
}
