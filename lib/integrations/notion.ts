/** Notion OAuth + API helpers. Tokens don't expire and have no refresh flow. */

const NOTION_VERSION = "2022-06-28";

export function notionAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; workspace_name?: string }> {
  const basic = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Notion token exchange failed: ${res.status}`);
  return res.json();
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

type NotionRichText = { plain_text?: string };
type NotionTitleProp = { type: string; title?: NotionRichText[] };

function extractTitle(props: Record<string, NotionTitleProp> | undefined): string {
  if (!props) return "Untitled";
  const titleProp = Object.values(props).find((p) => p.type === "title");
  const text = (titleProp?.title ?? []).map((t) => t.plain_text ?? "").join("");
  return text.trim() || "Untitled";
}

/** The user's most recently edited Notion pages (id + title). */
export async function notionRecentPages(
  token: string,
): Promise<{ id: string; title: string }[]> {
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: notionHeaders(token),
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 12,
    }),
  });
  if (!res.ok) throw new Error(`Notion search failed: ${res.status}`);
  const data = (await res.json()) as {
    results?: { id: string; properties?: Record<string, NotionTitleProp> }[];
  };
  return (data.results ?? []).map((p) => ({ id: p.id, title: extractTitle(p.properties) }));
}

type NotionBlock = {
  type: string;
  [key: string]: unknown;
};

/** Flatten a Notion page's top-level blocks into plain text. */
export async function notionPageText(token: string, pageId: string): Promise<string> {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
    { headers: notionHeaders(token) },
  );
  if (!res.ok) throw new Error(`Notion blocks failed: ${res.status}`);
  const data = (await res.json()) as { results?: NotionBlock[] };

  const lines: string[] = [];
  for (const block of data.results ?? []) {
    const body = block[block.type] as { rich_text?: NotionRichText[] } | undefined;
    const text = (body?.rich_text ?? []).map((t) => t.plain_text ?? "").join("");
    if (text.trim()) lines.push(text);
  }
  return lines.join("\n\n");
}
