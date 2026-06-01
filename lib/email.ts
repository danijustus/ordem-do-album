// Envio de e-mail de aviso (lado do servidor). Usa a API do Resend via fetch,
// então não precisa de pacote extra. É "melhor esforço": se algo falhar, apenas
// registra no log e NUNCA quebra a aprovação da cliente.

export async function notificarAprovacao(opts: {
  projetoNome: string;
  projetoId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const para = process.env.NOTIFY_EMAIL;

  if (!apiKey || !para) {
    console.warn(
      "[Email] RESEND_API_KEY e/ou NOTIFY_EMAIL ausentes — aviso não enviado."
    );
    return;
  }

  const base = process.env.APP_URL || "http://localhost:3939";
  const link = `${base}/admin/${opts.projetoId}`;
  const remetente =
    process.env.EMAIL_FROM || "Ordem do Álbum <onboarding@resend.dev>";

  const html = `
    <meta charset="utf-8">
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <h2 style="margin: 0 0 8px;">✓ Álbum aprovado</h2>
      <p style="margin: 0 0 16px; color: #525252; line-height: 1.5;">
        A cliente aprovou a ordem do álbum
        <strong>${escapar(opts.projetoNome)}</strong>.
        As fotos já estão prontas para download na ordem definitiva.
      </p>
      <a href="${link}"
         style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600;">
        Abrir projeto e baixar
      </a>
      <p style="margin: 20px 0 0; font-size: 12px; color: #a3a3a3;">
        Ordem do Álbum
      </p>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [para],
        subject: `Álbum aprovado: ${opts.projetoNome}`,
        html,
      }),
    });
    if (!r.ok) {
      console.warn("[Email] Falha ao enviar aviso:", await r.text());
    }
  } catch (e) {
    console.warn("[Email] Erro ao enviar aviso:", e);
  }
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
