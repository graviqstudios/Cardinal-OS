import { createHmac, randomBytes } from "crypto";

/**
 * Evernote OAuth 1.0a (HMAC-SHA1). Evernote still uses the legacy OAuth flow:
 * request token → user authorize → access token. The resulting token is the
 * auth token for the NoteStore Thrift API (note import is a later step).
 */

function base(): string {
  return process.env.EVERNOTE_ENV === "sandbox"
    ? "https://sandbox.evernote.com"
    : "https://www.evernote.com";
}

// RFC 3986 percent-encoding (stricter than encodeURIComponent).
function pe(s: string): string {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function sign(
  method: string,
  baseUrl: string,
  params: Record<string, string>,
  tokenSecret = "",
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${pe(k)}=${pe(params[k])}`)
    .join("&");
  const baseString = `${method}&${pe(baseUrl)}&${pe(sorted)}`;
  const key = `${pe(process.env.EVERNOTE_CONSUMER_SECRET!)}&${pe(tokenSecret)}`;
  return createHmac("sha1", key).update(baseString).digest("base64");
}

async function oauthGet(
  extraParams: Record<string, string>,
  tokenSecret = "",
): Promise<Record<string, string>> {
  const url = `${base()}/oauth`;
  const params: Record<string, string> = {
    oauth_consumer_key: process.env.EVERNOTE_CONSUMER_KEY!,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_version: "1.0",
    ...extraParams,
  };
  params.oauth_signature = sign("GET", url, params, tokenSecret);
  const qs = Object.keys(params)
    .map((k) => `${pe(k)}=${pe(params[k])}`)
    .join("&");

  const res = await fetch(`${url}?${qs}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`Evernote OAuth failed: ${res.status}`);
  return Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
}

/** Step 1: a request token + its secret, for the authorize redirect. */
export async function evernoteRequestToken(
  callbackUrl: string,
): Promise<{ oauth_token: string; oauth_token_secret: string }> {
  const r = await oauthGet({ oauth_callback: callbackUrl });
  return { oauth_token: r.oauth_token, oauth_token_secret: r.oauth_token_secret };
}

export function evernoteAuthorizeUrl(oauthToken: string): string {
  return `${base()}/OAuth.action?oauth_token=${encodeURIComponent(oauthToken)}`;
}

/** Step 3: exchange the verified request token for an access token. */
export async function evernoteAccessToken(
  oauthToken: string,
  verifier: string,
  tokenSecret: string,
): Promise<Record<string, string>> {
  return oauthGet({ oauth_token: oauthToken, oauth_verifier: verifier }, tokenSecret);
}
