import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { publicSessionStateSchema, type PublicSessionState } from "../../packages/shared/src/index";

declare global {
  interface Window {
    __partyQA: { socket: WebSocket | null; snapshot: PublicSessionState | null };
  }
}
const headers = { "X-Requested-With": "misthy-admin" };

class Operator {
  ws: WebSocket;
  snapshot: PublicSessionState | null = null;
  constructor(connection: { url: string; protocols: string[] }) {
    this.ws = new WebSocket(`ws://127.0.0.1:8790${connection.url}`, connection.protocols);
    this.ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as { type: string; state?: unknown };
      if (message.type === "STATE_SYNC")
        this.snapshot = publicSessionStateSchema.parse(message.state);
    };
  }
  async send(command: Record<string, unknown>) {
    await expect.poll(() => this.ws.readyState).toBe(WebSocket.OPEN);
    const commandId = crypto.randomUUID();
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws.removeEventListener("message", handler);
        reject(new Error("Admin ACK timeout"));
      }, 30000);
      const handler = (event: MessageEvent) => {
        const message = JSON.parse(String(event.data)) as {
          type: string;
          commandId?: string;
          code?: string;
        };
        if (message.commandId !== commandId) return;
        clearTimeout(timeout);
        this.ws.removeEventListener("message", handler);
        if (message.type === "COMMAND_ACK") resolve();
        else reject(new Error(message.code));
      };
      this.ws.addEventListener("message", handler);
      this.ws.send(JSON.stringify({ type: "COMMAND", command: { commandId, ...command } }));
    });
  }
  action(action: string) {
    return this.send({ type: "ADMIN_ACTION", action });
  }
}

async function fixture(request: APIRequestContext, mode: string) {
  await request.post("/api/admin/auth/bootstrap", {
    headers: { "X-Bootstrap-Secret": "player-e2e-bootstrap" },
    data: {
      email: "player-e2e@example.test",
      displayName: "Local QA",
      password: "player-e2e-password-123",
    },
  });
  expect(
    (
      await request.post("/api/admin/auth/login", {
        data: { email: "player-e2e@example.test", password: "player-e2e-password-123" },
      })
    ).ok(),
  ).toBe(true);
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  const assetResponse = await request.post("/api/admin/assets", {
    headers,
    multipart: {
      title: "Original QA mint",
      tags: "[]",
      category: "qa",
      status: "ACTIVE",
      file: { name: "original.gif", mimeType: "image/gif", buffer: gif },
    },
  });
  expect(assetResponse.status()).toBe(201);
  const asset = ((await assetResponse.json()) as { item: { id: string } }).item.id;
  const questions: string[] = [];
  for (const text of ["Khi cả hội cùng gửi meme…", "Vòng đổi chế độ"]) {
    const response = await request.post("/api/admin/questions", {
      headers,
      data: {
        text,
        memeAssetIds: [asset],
        status: "ACTIVE",
        submissionDurationSeconds: 300,
        votingDurationSeconds: 180,
      },
    });
    expect(response.status()).toBe(201);
    questions.push(((await response.json()) as { item: { id: string } }).item.id);
  }
  const preset = await request.post("/api/admin/presets", {
    headers,
    data: {
      name: `Concurrent ${mode}`,
      mode,
      questionIds: questions,
      scoring: { winnerPoints: 100, participationPoints: 1 },
      votingRules: {
        allowSelfVote: false,
        votesPerPlayer: 1,
        audienceVoting: mode === "COMMUNITY_MODE",
      },
    },
  });
  expect(preset.status()).toBe(201);
  const presetId = ((await preset.json()) as { item: { id: string } }).item.id;
  const session = await request.post("/api/admin/sessions", {
    headers,
    data: { name: `Local QA ${mode}`, presetId },
  });
  expect(session.status()).toBe(201);
  const data = (await session.json()) as {
    session: { code: string };
    connection: { url: string; protocols: string[] };
  };
  return { code: data.session.code, asset, operator: new Operator(data.connection) };
}

async function installProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    window.__partyQA = { socket: null, snapshot: null };
    const Original = window.WebSocket;
    window.WebSocket = class extends Original {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        window.__partyQA.socket = this;
        this.addEventListener("message", (event) => {
          const message = JSON.parse(String(event.data)) as {
            type: string;
            state: PublicSessionState;
          };
          if (message.type === "STATE_SYNC") window.__partyQA.snapshot = message.state;
        });
      }
    };
  });
}
async function browserCommand(page: Page, command: Record<string, unknown>) {
  return page.evaluate(
    (value) =>
      new Promise<{ type: string; code?: string; duplicate?: boolean; durationMs: number }>(
        (resolve, reject) => {
          const ws = window.__partyQA.socket;
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            reject(new Error("Player socket unavailable"));
            return;
          }
          const started = performance.now();
          const timeout = setTimeout(() => {
            ws.removeEventListener("message", handler);
            reject(new Error("Player ACK timeout"));
          }, 30000);
          const handler = (event: MessageEvent) => {
            const message = JSON.parse(String(event.data)) as {
              type: string;
              commandId?: string;
              code?: string;
              duplicate?: boolean;
            };
            if (message.commandId !== value.commandId) return;
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            resolve({
              type: message.type,
              ...(message.code ? { code: message.code } : {}),
              ...(message.duplicate === undefined ? {} : { duplicate: message.duplicate }),
              durationMs: performance.now() - started,
            });
          };
          ws.addEventListener("message", handler);
          ws.send(JSON.stringify({ type: "COMMAND", command: value }));
        },
      ),
    { commandId: crypto.randomUUID(), ...command },
  );
}
async function batches<T>(
  values: T[],
  action: (value: T, index: number) => Promise<void>,
  size = 5,
) {
  for (let index = 0; index < values.length; index += size)
    await Promise.all(
      values.slice(index, index + size).map((value, offset) => action(value, index + offset)),
    );
}

for (const [mode, count] of [
  ["TALENT_MODE", 30],
  ["COMMUNITY_MODE", 50],
] as const) {
  test(`${count} real browser players complete ${mode} with reconnect and bounded writes`, async ({
    browser,
    request,
  }, testInfo) => {
    // Deliberately fixed local origin. This suite must never target a cloud deployment.
    expect(testInfo.project.use.baseURL).toBe("http://127.0.0.1:8790");
    const { code, asset, operator } = await fixture(request, mode);
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const latencies: number[] = [];
    const consoleErrors: string[] = [];
    let contentRequests = 0;
    try {
      await batches(Array.from({ length: count }), async (_, index) => {
        const context = await browser.newContext({
          baseURL: "http://127.0.0.1:8790",
          viewport: { width: 390, height: 844 },
        });
        contexts[index] = context;
        await installProbe(context);
        const page = await context.newPage();
        pages[index] = page;
        page.on("pageerror", (error) => consoleErrors.push(error.message));
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.endsWith("/content")) contentRequests++;
        });
        await page.goto(`/play/${code}`);
        await page.getByLabel("Biệt danh").fill(`Fan ${index + 1}`);
        await page.getByRole("button", { name: "Xác nhận tham gia" }).click();
        await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
      });
      await expect
        .poll(() => operator.snapshot?.players.filter((p) => p.connected).length)
        .toBe(count);
      expect(
        (
          await request.post(`/api/sessions/${code}/join`, { data: { displayName: " FAN 1 " } })
        ).status(),
      ).toBe(409);
      if (count === 50)
        expect(
          (
            await request.post(`/api/sessions/${code}/join`, { data: { displayName: "Overflow" } })
          ).status(),
        ).toBe(409);

      await operator.action("START");
      await operator.action("ADVANCE");
      expect(
        (
          await request.post(`/api/sessions/${code}/join`, { data: { displayName: "Late fan" } })
        ).status(),
      ).toBe(409);
      await Promise.all(
        pages.map((page) =>
          expect(page.getByRole("heading", { name: "Chọn cú chốt của bạn" })).toBeVisible(),
        ),
      );
      const first = pages[0]!;
      // One genuine UI submission, then other browsers send the same validated protocol through their actual app sockets.
      await first.getByRole("button", { name: "Chọn meme Original QA mint", exact: true }).click();
      await first.getByRole("button", { name: "Chốt meme này", exact: true }).click();
      await first.getByRole("button", { name: "Xác nhận", exact: true }).click();
      await expect(first.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
      await first.reload();
      await expect(first.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
      const submitted = await Promise.all(
        pages
          .slice(1)
          .map((page) => browserCommand(page, { type: "SUBMIT_MEME", memeAssetId: asset })),
      );
      for (const result of submitted) {
        expect(result.type).toBe("COMMAND_ACK");
        latencies.push(result.durationMs);
      }
      expect((await browserCommand(first, { type: "SUBMIT_MEME", memeAssetId: asset })).code).toBe(
        "DUPLICATE_SUBMISSION",
      );
      await expect.poll(() => operator.snapshot?.submissionCount).toBe(count);
      await operator.action("ADVANCE");
      const submissions = operator.snapshot!.submissions;
      if (mode === "COMMUNITY_MODE") {
        await operator.action("ADVANCE");
        await Promise.all(
          pages.map((page) =>
            page.waitForFunction(() => window.__partyQA.snapshot?.phase === "VOTING"),
          ),
        );
        const firstPlayerId = await first.evaluate(() => window.__partyQA.snapshot!.viewerId);
        const own = submissions.find((s) => s.authorPlayerId === firstPlayerId)!;
        expect(
          (await browserCommand(first, { type: "CAST_VOTE", submissionId: own.id })).code,
        ).toBe("SELF_VOTE");
        await contexts[0]!.setOffline(true);
        // Explicit close reflects a dropped connection rather than depending on OS socket buffering.
        await first.evaluate(() => window.__partyQA.socket?.close());
        await contexts[0]!.setOffline(false);
        await first.evaluate(() => window.dispatchEvent(new Event("online")));
        await first.waitForFunction(
          () =>
            window.__partyQA.socket?.readyState === WebSocket.OPEN &&
            window.__partyQA.snapshot?.phase === "VOTING",
        );
        const voted = await Promise.all(
          pages.map(async (page) => {
            const id = await page.evaluate(() => window.__partyQA.snapshot!.viewerId);
            const index = submissions.findIndex((s) => s.authorPlayerId === id);
            const target = submissions[(index + 1) % submissions.length]!;
            const command = {
              type: "CAST_VOTE",
              commandId: crypto.randomUUID(),
              submissionId: target.id,
            };
            const result = await browserCommand(page, command);
            return { result, command };
          }),
        );
        for (const { result } of voted) {
          expect(result.type).toBe("COMMAND_ACK");
          latencies.push(result.durationMs);
        }
        expect((await browserCommand(first, voted[0]!.command)).duplicate).toBe(true);
        expect(
          (await browserCommand(first, { ...voted[0]!.command, commandId: crypto.randomUUID() }))
            .code,
        ).toBe("DUPLICATE_VOTE");
        await operator.action("ADVANCE");
        expect(operator.snapshot!.submissions.every((s) => s.voteCount === 1)).toBe(true);
      } else await operator.send({ type: "SELECT_WINNER", submissionId: submissions[0]!.id });
      await expect.poll(() => operator.snapshot?.resultPending).toBe(true);
      expect(operator.snapshot!.players.every((p) => p.score === 0)).toBe(true);
      await operator.send({
        type: "PUBLISH_RESULT",
        confirmed: true,
        expectedVersion: operator.snapshot!.version,
      });
      await expect.poll(() => operator.snapshot?.phase).toBe("RESULT");
      expect(operator.snapshot!.players.reduce((sum, p) => sum + p.score, 0)).toBe(count + 100);
      await operator.action("ADVANCE");
      const nextMode = mode === "TALENT_MODE" ? "COMMUNITY_MODE" : "TALENT_MODE";
      await operator.send({ type: "SET_MODE", mode: nextMode });
      await operator.action("ADVANCE");
      expect(operator.snapshot!.mode).toBe(nextMode);
      expect(operator.snapshot!.roundNumber).toBe(2);
      await expect(first.getByRole("alert")).toHaveCount(0);
      await operator.action("RECOVER_SESSION");
      expect(operator.snapshot!.submissionCount).toBe(0);
      expect(consoleErrors).toEqual([]);
      expect(contentRequests).toBeLessThan(count * 16);
      const sorted = latencies.sort((a, b) => a - b);
      const metrics = {
        mode,
        concurrentBrowserPlayers: count,
        contentRequests,
        commandsMeasured: sorted.length,
        ackP50Ms: Math.round(sorted[Math.floor(sorted.length * 0.5)]!),
        ackP95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]!),
        maxAckMs: Math.round(sorted.at(-1)!),
        origin: "local Wrangler only",
        media: "original tiny GIF; full-size media bandwidth requires event rehearsal",
      };
      await mkdir("artifacts/phase08", { recursive: true });
      await writeFile(`artifacts/phase08/${mode}.json`, JSON.stringify(metrics, null, 2));
      await testInfo.attach("local-concurrency-metrics", {
        body: JSON.stringify(metrics),
        contentType: "application/json",
      });
      await first.screenshot({ path: `artifacts/phase08/${mode}.png`, fullPage: true });
    } finally {
      operator.ws.close();
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}

test("player media failure retry, keyboard flow and reduced motion at 320px", async ({
  page,
  request,
}) => {
  const { code, asset, operator } = await fixture(request, "TALENT_MODE");
  try {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/play/${code}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.getByLabel("Biệt danh").focus();
    await page.keyboard.type("Keyboard fan");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Xác nhận tham gia" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
    await page.route(`**/content/${asset}`, (route) =>
      route.fulfill({ status: 503, body: "local failure injection" }),
    );
    await operator.action("START");
    await operator.action("ADVANCE");
    await expect(page.getByText("Ảnh chưa sẵn sàng", { exact: true })).toBeVisible();
    await page.unroute(`**/content/${asset}`);
    await page.getByRole("button", { name: "Tải lại ảnh", exact: true }).click();
    const play = page.getByRole("button", { name: "Phát ảnh động: Original QA mint", exact: true });
    await expect(play).toBeVisible();
    expect(await page.getByAltText("Original QA mint").count()).toBe(0);
    const target = await play.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    await play.click();
    await expect(page.getByAltText("Original QA mint")).toBeVisible();
    await page.evaluate(() => {
      // Add real scrollable content rather than depending on body/min-height or cascade layers.
      const spacer = document.createElement("pre");
      spacer.id = "qa-scroll-spacer";
      spacer.textContent = "viewport lifecycle check\n".repeat(400);
      document.body.appendChild(spacer);
      window.scrollTo({ top: 4000, behavior: "instant" });
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(3000);
    await expect(page.getByAltText("Original QA mint")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByAltText("Original QA mint")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    operator.ws.close();
  }
});
