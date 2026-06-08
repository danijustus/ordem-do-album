// Envio de e-mail (lado do servidor). Usa a API do Resend via fetch, então não
// precisa de pacote extra. É "melhor esforço": se algo falhar, apenas registra
// no log e NUNCA quebra a aprovação da cliente.

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Envio genérico. Retorna true se enviou, false se faltou config ou falhou.
async function enviar(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY ausente — e-mail não enviado.");
    return false;
  }
  const remetente =
    process.env.EMAIL_FROM || "Ordem do Álbum <onboarding@resend.dev>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!r.ok) {
      console.warn("[Email] Falha ao enviar:", await r.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[Email] Erro ao enviar:", e);
    return false;
  }
}

// Aviso para a fotógrafa de que a cliente aprovou o álbum.
export async function notificarAprovacao(opts: {
  projetoNome: string;
  projetoId: string;
  clienteEmail?: string | null;
}): Promise<void> {
  const para = process.env.NOTIFY_EMAIL;
  if (!para) {
    console.warn("[Email] NOTIFY_EMAIL ausente — aviso não enviado.");
    return;
  }

  const base = process.env.APP_URL || "http://localhost:3939";
  const link = `${base}/admin/${opts.projetoId}`;

  const contato = opts.clienteEmail
    ? `<p style="margin: 0 0 16px; color: #525252; line-height: 1.5;">
         E-mail da cliente:
         <a href="mailto:${escapar(opts.clienteEmail)}" style="color:#be185d;">${escapar(opts.clienteEmail)}</a>
       </p>`
    : "";

  const html = `
    <meta charset="utf-8">
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <h2 style="margin: 0 0 8px;">✓ Álbum aprovado</h2>
      <p style="margin: 0 0 16px; color: #525252; line-height: 1.5;">
        A cliente aprovou a ordem do álbum
        <strong>${escapar(opts.projetoNome)}</strong>.
        As fotos já estão prontas para download na ordem definitiva.
      </p>
      ${contato}
      <a href="${link}"
         style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600;">
        Abrir projeto e baixar
      </a>
      <p style="margin: 20px 0 0; font-size: 12px; color: #a3a3a3;">
        Ordem do Álbum
      </p>
    </div>
  `;

  await enviar({
    to: para,
    subject: `Álbum aprovado: ${opts.projetoNome}`,
    html,
  });
}

// Confirmação para a CLIENTE de que recebemos as fotos e a ordem.
export async function confirmarParaCliente(opts: {
  email: string;
  projetoNome: string;
}): Promise<void> {
  const replyTo = process.env.NOTIFY_EMAIL || undefined;

  const html = `
    <meta charset="utf-8">
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <h2 style="margin: 0 0 12px; font-weight: 600;">Recebemos as fotos do seu álbum 💕</h2>
      <p style="margin: 0 0 16px; color: #525252; line-height: 1.6;">
        Oi! Recebemos suas fotos e a confirmação da ordem em que elas devem
        aparecer no seu álbum <strong>${escapar(opts.projetoNome)}</strong>.
      </p>
      <p style="margin: 0 0 16px; color: #525252; line-height: 1.6;">
        <strong>Em até 10 dias úteis</strong> você vai receber o layout para
        aprovação.
      </p>
      <p style="margin: 0 0 16px; color: #525252; line-height: 1.6;">
        Qualquer dúvida, é só responder este e-mail.
      </p>
      <p style="margin: 24px 0 0; color: #171717; line-height: 1.6;">
        Com carinho,<br>
        <span style="font-size: 18px;">Lembra?</span>
      </p>
    </div>
  `;

  await enviar({
    to: opts.email,
    subject: "Recebemos as fotos do seu álbum 💕",
    html,
    replyTo,
  });
}
