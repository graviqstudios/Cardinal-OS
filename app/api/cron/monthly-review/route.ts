import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { generateMonthlyReview } from "@/lib/journal/monthly";
import { reindexJournalEntry } from "@/lib/journal/embed";
import { brevoConfigured, sendEmail } from "@/lib/email/brevo";

export const runtime = "nodejs";
export const maxDuration = 300;

/** True when `d` is the final calendar day of its month (28/29/30/31). */
function isLastDayOfMonth(d: Date): boolean {
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  return next.getMonth() !== d.getMonth();
}

/**
 * Monthly review cron. Vercel triggers this on a schedule (see vercel.json) and
 * authenticates with the CRON_SECRET. For every user it generates a Claude-written
 * review of the month that's ending, saves it to their journal, and emails it via
 * Brevo.
 *
 * The schedule fires on days 28–31; we only proceed on the actual last day of the
 * month so the review lands on month-end and summarises the whole month — never on
 * a phantom "30th" that doesn't exist in February.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isLastDayOfMonth(new Date())) {
    return Response.json({ skipped: "not the last day of the month" });
  }
  if (!brevoConfigured()) {
    return Response.json({ skipped: "email not configured" });
  }
  if (!hasServiceRole()) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id, email, name")
    .not("email", "is", null);

  let sent = 0;
  for (const u of users ?? []) {
    try {
      const { title, text } = await generateMonthlyReview(admin, u.id as string);

      const { data: entry } = await admin
        .from("journal_entries")
        .insert({
          user_id: u.id,
          type: "monthly",
          title,
          content: text,
          date: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (entry) await reindexJournalEntry(admin, u.id as string, entry.id as string, text);

      await sendEmail({
        to: u.email as string,
        toName: (u.name as string) ?? null,
        subject: `Your ${title} review · Cardinal OS`,
        html: emailHtml(title, (u.name as string)?.split(" ")[0] ?? "there", text),
      });
      sent += 1;
    } catch {
      // Skip a failing user; never let one block the rest of the run.
    }
  }

  return Response.json({ ok: true, sent });
}

function emailHtml(title: string, name: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#14100B;padding:32px 16px;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;background:#1A140F;border:1px solid rgba(242,233,219,0.1);border-radius:18px;padding:32px;color:#EFE6D6;">
    <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#C97A63;">${title}</div>
    <h1 style="font-size:24px;font-weight:400;margin:8px 0 16px;">Hello, ${name}.</h1>
    <p style="font-size:16px;line-height:1.7;color:#D7CCBA;white-space:pre-wrap;">${escapeHtml(body)}</p>
    <p style="font-size:13px;color:#897C68;margin-top:24px;">— Cardinal OS, by GraviQ Studios</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
