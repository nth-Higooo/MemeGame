import { createMiddleware } from "hono/factory";
import { bodyLimit } from "hono/body-limit";
import { uploadLimit } from "./media";
import type { Env } from "./env";

export class WindowLimiter {
  private buckets = new Map<string, { until: number; count: number }>();
  constructor(private readonly capacity = 10000) {}
  allow(key: string, maximum: number, now = Date.now(), windowMs = 60000) {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.until <= now) {
      if (this.buckets.size >= this.capacity) {
        for (const [id, item] of this.buckets) if (item.until <= now) this.buckets.delete(id);
        if (this.buckets.size >= this.capacity) return false;
      }
      bucket = { until: now + windowMs, count: 0 };
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return bucket.count <= maximum;
  }
}

// Best-effort per-isolate HTTP protection; authoritative room/socket limits live in the DO.
const limiter = new WindowLimiter();
export const protection = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const path = c.req.path;
  const ip = c.req.header("CF-Connecting-IP") ?? "local";
  const join = /^\/api\/sessions\/([A-Z0-9]{6})\/join$/.exec(path);
  const group = join
    ? `join:${join[1]}`
    : path.includes("/auth/") || path.includes("/login")
      ? "auth"
      : "general";
  const maximum = join ? 65 : group === "auth" ? 120 : 3000;
  if (!limiter.allow(`${ip}:${group}`, maximum)) {
    c.header("Retry-After", "60");
    return c.json(
      { error: "rate_limited", message: "Quá nhiều yêu cầu. Vui lòng chờ một phút rồi thử lại." },
      429,
    );
  }
  const maximumBytes =
    path === "/api/admin/assets" && c.req.method === "POST"
      ? uploadLimit(c.env.MAX_UPLOAD_BYTES) + 65536
      : 1024 * 1024;
  return bodyLimit({
    maxSize: maximumBytes,
    onError: (context) =>
      context.json({ error: "body_too_large", message: "Dữ liệu vượt giới hạn cho phép." }, 413),
  })(c, next);
});
