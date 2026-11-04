import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "./env";

export type AdminSession = { sub: string; email: string; role: "OWNER" | "EDITOR"; exp: number };
type Variables = { admin: AdminSession };
const COOKIE = "misthy_admin";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export async function hashPassword(
  password: string,
  salt = crypto.getRandomValues(new Uint8Array(16)),
  iterations = 120_000,
) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return { hash: toBase64Url(new Uint8Array(bits)), salt: toBase64Url(salt), iterations };
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string,
  iterations: number,
) {
  const derived = await hashPassword(password, fromBase64Url(salt), iterations);
  return equalBytes(fromBase64Url(derived.hash), fromBase64Url(expectedHash));
}

export async function createSessionToken(session: Omit<AdminSession, "exp">, secret: string) {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ ...session, exp: Date.now() + 8 * 60 * 60 * 1000 })),
  );
  return `${payload}.${toBase64Url(await hmac(payload, secret))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<AdminSession | null> {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    if (!equalBytes(fromBase64Url(signature), await hmac(payload, secret))) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as AdminSession;
    if (
      !session.sub ||
      !session.email ||
      !["OWNER", "EDITOR"].includes(session.role) ||
      session.exp < Date.now()
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

export function setAdminCookie<E extends { Bindings: Env }>(c: Context<E>, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export function clearAdminCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: "/", sameSite: "Strict" });
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next,
) => {
  const token = getCookie(c, COOKIE);
  const session = token ? await verifySessionToken(token, c.env.ADMIN_SESSION_SECRET) : null;
  if (!session)
    return c.json({ error: "unauthorized", message: "Vui lòng đăng nhập quản trị." }, 401);
  const active = await c.env.DB.prepare("SELECT id FROM admin_users WHERE id=? AND status='ACTIVE'")
    .bind(session.sub)
    .first();
  if (!active)
    return c.json({ error: "unauthorized", message: "Quyền quản trị đã hết hiệu lực." }, 401);

  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    if (c.req.header("X-Requested-With") !== "misthy-admin") {
      return c.json({ error: "csrf_check_failed", message: "Yêu cầu quản trị không hợp lệ." }, 403);
    }
    const origin = c.req.header("Origin");
    if (origin && origin !== new URL(c.req.url).origin) {
      return c.json({ error: "origin_check_failed", message: "Nguồn yêu cầu không hợp lệ." }, 403);
    }
  }
  c.set("admin", session);
  await next();
};

export async function digestText(value: string) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export function safeSecretEqual(left: string, right: string) {
  return equalBytes(encoder.encode(left), encoder.encode(right));
}
