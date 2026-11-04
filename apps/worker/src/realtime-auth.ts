import { connectionTicketSchema, type ConnectionTicket } from "@misthy/shared";

const encoder = new TextEncoder();

function encode(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function equal(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

export async function issueConnectionTicket(
  ticket: Omit<ConnectionTicket, "expiresAt" | "nonce">,
  secret: string,
) {
  const payload = encode(
    encoder.encode(
      JSON.stringify({ ...ticket, expiresAt: Date.now() + 60_000, nonce: crypto.randomUUID() }),
    ),
  );
  return `${payload}.${encode(await sign(payload, secret))}`;
}

export async function verifyConnectionTicket(token: string, secret: string) {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    if (!equal(decode(signature), await sign(payload, secret))) return null;
    const parsed = connectionTicketSchema.safeParse(
      JSON.parse(new TextDecoder().decode(decode(payload))),
    );
    if (!parsed.success || parsed.data.expiresAt < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function createReconnectToken() {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
