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
  /** Brevo tags for categorising the message (visible in the Brevo dashboard). */
  tags?: string[];
  /** Overrides EMAIL_REPLY_TO for this message; where replies should land. */
  replyTo?: string;
}): Promise<void> {
  // Send from the (send-only) EMAIL_FROM address, but route replies to a real
  // inbox - EMAIL_REPLY_TO (e.g. support@graviq.in) - so noreply@ replies aren't lost.
  const replyToEmail = opts.replyTo || process.env.EMAIL_REPLY_TO;

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
      ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
      subject: opts.subject,
      htmlContent: opts.html,
      ...(opts.tags && opts.tags.length ? { tags: opts.tags } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`);
  }
}
