import { healthResponseSchema } from "../packages/shared/src/contracts.ts";

export async function verifyDeployment(origin, { allowLocal = false } = {}) {
  const url = new URL(origin);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(allowLocal && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "Use a verified HTTPS origin without credentials, paths, query strings or fragments",
    );
  const get = (path) =>
    fetch(new URL(path, url), { redirect: "error", signal: AbortSignal.timeout(20000) });
  const health = await get("/api/health");
  if (!health.ok) throw new Error("Health request failed");
  healthResponseSchema.parse(await health.json());
  for (const path of [
    "/",
    "/play/MT2026",
    "/display/MT2026",
    "/admin/MT2026",
    "/admin/MT2026/content",
    "/judge/MT2026",
  ]) {
    const response = await get(path);
    if (response.status !== 200 || !response.headers.get("Content-Type")?.includes("text/html"))
      throw new Error(`SPA routing failed: ${path}`);
    const html = await response.text();
    if (!html.includes('lang="vi"') || !html.includes('id="root"'))
      throw new Error(`Unexpected frontend document: ${path}`);
  }
  for (const path of ["/api", "/api/not-a-real-endpoint", "/ws"]) {
    const response = await get(path);
    if (
      response.status !== 404 ||
      !response.headers.get("Content-Type")?.includes("application/json")
    )
      throw new Error(`API path incorrectly fell back to HTML: ${path}`);
  }
  const auth = await get("/api/admin/auth/me");
  if (auth.status !== 401) throw new Error("Admin authentication guard failed");
  console.log(
    "Read-only routing, HTTPS/origin, health and authentication checks passed. Full event acceptance still required.",
  );
  return url.origin;
}
if (process.argv[1]?.endsWith("verify-deployment.mjs"))
  verifyDeployment(process.argv[2], { allowLocal: process.argv.includes("--local") }).catch(() => {
    console.error("Deployment verification failed; no production acceptance claimed.");
    process.exitCode = 1;
  });
