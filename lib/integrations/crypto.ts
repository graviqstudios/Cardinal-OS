import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for integration tokens at rest. The key comes from
 * INTEGRATION_ENC_KEY (32 bytes, supplied as base64 or hex - generate with
 * `openssl rand -base64 32`). Format: base64(iv).base64(tag).base64(ciphertext).
 *
 * Throws only when actually called without a valid key, so the module is safe
 * to import in builds where integrations aren't configured yet.
 */
function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENC_KEY;
  if (!raw) throw new Error("INTEGRATION_ENC_KEY is not set.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENC_KEY must decode to 32 bytes (256 bits).");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted token.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
