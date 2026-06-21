/**
 * Transactional email via Brevo (free tier). Configure with BREVO_API_KEY and a
 * verified sender (EMAIL_FROM / EMAIL_FROM_NAME). No-ops gracefully when unset.
 */

export function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(opts: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "Cardinal OS",
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: opts.to, name: opts.toName ?? undefined }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`);
  }
}
