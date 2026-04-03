import { Resend } from "resend";

const RESEND_FROM = "World Tech Manager <contato@wtm.com>";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

const buildResetTemplate = (resetUrl: string, email: string) => {
  return `
  <div style="background:#040814;padding:34px;font-family:Arial,sans-serif;color:#e5e7eb;">
    <div style="max-width:580px;margin:0 auto;background:linear-gradient(160deg,rgba(17,24,39,0.95),rgba(15,23,42,0.92));border:1px solid rgba(250,204,21,0.36);border-radius:20px;padding:30px;box-shadow:0 20px 70px rgba(250,204,21,0.14);">
      <div style="text-align:center;margin-bottom:22px;">
        <img src="${APP_URL}/logo.png" alt="World Tech Manager" style="height:60px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(250,204,21,0.3));" />
      </div>
      <h2 style="margin:0 0 12px 0;color:#facc15;font-size:26px;letter-spacing:0.3px;">Recuperação de Senha</h2>
      <p style="margin:0 0 10px 0;color:#cbd5e1;line-height:1.6;">Recebemos um pedido para redefinir a senha da conta <strong>${email}</strong>.</p>
      <p style="margin:0 0 24px 0;color:#94a3b8;line-height:1.6;">Clique no botão abaixo para criar uma nova senha com segurança.</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:#facc15;color:#0b1120;font-weight:800;text-decoration:none;border-radius:10px;box-shadow:0 10px 30px rgba(250,204,21,0.35);">
          Redefinir Senha
        </a>
      </div>
      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">Se você não solicitou essa ação, ignore este e-mail. O link expira automaticamente por segurança.</p>
    </div>
  </div>
  `;
};

const buildSubscriptionCancelledTemplate = (email: string) => {
  return `
  <div style="background:#040814;padding:34px;font-family:Arial,sans-serif;color:#e5e7eb;">
    <div style="max-width:580px;margin:0 auto;background:linear-gradient(160deg,rgba(17,24,39,0.95),rgba(15,23,42,0.92));border:1px solid rgba(250,204,21,0.36);border-radius:20px;padding:30px;box-shadow:0 20px 70px rgba(250,204,21,0.14);">
      <div style="text-align:center;margin-bottom:22px;">
        <img src="${APP_URL}/logo.png" alt="World Tech Manager" style="height:60px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(250,204,21,0.3));" />
      </div>
      <h2 style="margin:0 0 12px 0;color:#facc15;font-size:26px;letter-spacing:0.3px;">Assinatura Cancelada</h2>
      <p style="margin:0 0 10px 0;color:#cbd5e1;line-height:1.6;">Sua assinatura foi cancelada com sucesso para a conta <strong>${email}</strong>.</p>
      <p style="margin:0;color:#94a3b8;line-height:1.6;">Se quiser voltar ao ecossistema World Tech Manager, basta realizar um novo pagamento para reativar o acesso.</p>
    </div>
  </div>
  `;
};

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}) {
  const resend = getResendClient();

  if (!resend) {
    return { simulated: true, reason: "RESEND_API_KEY_missing" };
  }

  const response = await resend.emails.send({
    from: RESEND_FROM,
    to: params.to,
    subject: "World Tech Manager - Recuperação de Senha",
    html: buildResetTemplate(params.resetUrl, params.to),
  });

  return response;
}

export async function sendSubscriptionCancelledEmail(params: {
  to: string;
}) {
  const resend = getResendClient();

  if (!resend) {
    return { simulated: true, reason: "RESEND_API_KEY_missing" };
  }

  const response = await resend.emails.send({
    from: RESEND_FROM,
    to: params.to,
    subject: "World Tech Manager - Assinatura cancelada",
    html: buildSubscriptionCancelledTemplate(params.to),
  });

  return response;
}
