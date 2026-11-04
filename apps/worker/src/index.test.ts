import { describe, expect, it } from "vitest";
import app from "./index";

describe("worker routes", () => {
  it("returns a healthy response", async () => {
    const response = await app.request("http://localhost/api/health");
    const body = (await response.json()) as {
      ok: boolean;
      service: string;
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("misthy-meme-party-api");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("keeps unknown API paths out of the SPA fallback", async () => {
    const response = await app.request("http://localhost/api/missing");
    expect(response.status).toBe(404);
  });
  it.each(["/api", "/ws"])("keeps the %s root out of SPA fallback", async (path) => {
    const response = await app.request(`http://localhost${path}`);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });
});
