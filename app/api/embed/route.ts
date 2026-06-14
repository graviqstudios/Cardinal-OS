import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/ai/chunk";
import { embedTexts } from "@/lib/ai/embeddings";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// NUL + C0 control chars (PDF extraction emits them); keep tab/newline/CR.
// Built from an escaped string so no literal control chars live in source.
// Postgres text columns reject NUL with "unsupported Unicode escape sequence".
const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]",
  "g",
);

function sanitize(text: string): string {
  return text.replace(CONTROL_CHARS, "");
}

/**
 * Document ingestion: accepts a multipart upload (PDF or text), stores it in the
 * private `documents` bucket, extracts + chunks + embeds the text, and writes
 * document_chunks for RAG. Returns the created document row.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "embed");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const subjectId = (form.get("subjectId") as string) || null;

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (max 15 MB)." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Extract text.
  let text = "";
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n\n") : res.text;
    } else {
      text = new TextDecoder().decode(bytes);
    }
  } catch {
    return Response.json({ error: "Could not read this file." }, { status: 422 });
  }

  text = sanitize(text);

  // Create the document row (processing).
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      file_name: file.name,
      status: "processing",
    })
    .select("*")
    .single();
  if (docErr || !doc) {
    return Response.json({ error: docErr?.message ?? "DB error" }, { status: 500 });
  }

  // Store the original file at <userId>/<docId> (storage RLS keys on folder).
  const path = `${user.id}/${doc.id}`;
  await supabase.storage.from("documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  // Chunk + embed.
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    await supabase.from("documents").update({ status: "error" }).eq("id", doc.id);
    return Response.json({ error: "No extractable text found." }, { status: 422 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks);
  } catch (e) {
    await supabase.from("documents").update({ status: "error" }).eq("id", doc.id);
    return Response.json(
      { error: e instanceof Error ? e.message : "Embedding failed." },
      { status: 502 },
    );
  }

  const rows = chunks.map((content, i) => ({
    user_id: user.id,
    document_id: doc.id,
    subject_id: subjectId,
    content,
    chunk_index: i,
    embedding: embeddings[i],
  }));
  const { error: chunkErr } = await supabase.from("document_chunks").insert(rows);
  if (chunkErr) {
    await supabase.from("documents").update({ status: "error" }).eq("id", doc.id);
    return Response.json({ error: chunkErr.message }, { status: 500 });
  }

  await supabase
    .from("documents")
    .update({ status: "ready", file_url: path })
    .eq("id", doc.id);

  return Response.json({
    document: { ...doc, status: "ready" },
    chunks: chunks.length,
  });
}
