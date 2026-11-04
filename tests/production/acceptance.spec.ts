import { expect, test, type Page } from "@playwright/test";
import { serverMessageSchema, type PublicSessionState } from "../../packages/shared/src/index";

class RemoteAdmin {
  socket: WebSocket;
  state: PublicSessionState | null = null;
  constructor(connection: { url: string; protocols: string[] }, origin: string) {
    const address = new URL(connection.url, origin);
    address.protocol = address.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(address, connection.protocols);
    this.socket.onmessage = (event) => {
      const message = serverMessageSchema.parse(JSON.parse(String(event.data)));
      if (message.type === "STATE_SYNC") this.state = message.state;
    };
  }
  async command(value: Record<string, unknown>) {
    await expect.poll(() => this.socket.readyState).toBe(WebSocket.OPEN);
    const commandId = crypto.randomUUID();
    await new Promise<void>((done, reject) => {
      const timeout = setTimeout(() => {
        this.socket.removeEventListener("message", receive);
        reject(new Error("Production command ACK timeout"));
      }, 20000);
      const receive = (event: MessageEvent) => {
        const message = serverMessageSchema.parse(JSON.parse(String(event.data)));
        if (
          (message.type !== "COMMAND_ACK" && message.type !== "ERROR") ||
          message.commandId !== commandId
        )
          return;
        clearTimeout(timeout);
        this.socket.removeEventListener("message", receive);
        if (message.type === "ERROR") reject(new Error(message.code));
        else done();
      };
      this.socket.addEventListener("message", receive);
      this.socket.send(JSON.stringify({ type: "COMMAND", command: { ...value, commandId } }));
    });
  }
  action(action: string) {
    return this.command({ type: "ADMIN_ACTION", action });
  }
}
async function submit(page: Page) {
  await page.getByRole("button", { name: "Chọn meme Original release GIF", exact: true }).click();
  await page.getByRole("button", { name: "Chốt meme này", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
}
for (const mode of ["TALENT_MODE", "COMMUNITY_MODE"]) {
  test(`bounded production acceptance ${mode}`, async ({ request, browser, baseURL }) => {
    if (
      process.env.PRODUCTION_ACCEPTANCE_LOCAL_REHEARSAL === "true" &&
      baseURL === "http://127.0.0.1:8790"
    ) {
      const bootstrap = await request.post("/api/admin/auth/bootstrap", {
        headers: { "X-Bootstrap-Secret": "release-rehearsal-bootstrap" },
        data: {
          email: process.env.PRODUCTION_ADMIN_EMAIL,
          displayName: "Local release rehearsal",
          password: process.env.PRODUCTION_ADMIN_PASSWORD,
        },
      });
      expect([201, 409]).toContain(bootstrap.status());
    }
    const login = await request.post("/api/admin/auth/login", {
      data: {
        email: process.env.PRODUCTION_ADMIN_EMAIL,
        password: process.env.PRODUCTION_ADMIN_PASSWORD,
      },
    });
    expect(login.status()).toBe(200);
    const headers = { "X-Requested-With": "misthy-admin" };
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    const uploaded = await request.post("/api/admin/assets", {
      headers,
      multipart: {
        title: "Original release GIF",
        tags: '["phase09-acceptance"]',
        category: "release-qa",
        status: "ACTIVE",
        file: { name: "release.gif", mimeType: "image/gif", buffer: gif },
      },
    });
    expect(uploaded.status()).toBe(201);
    const asset = ((await uploaded.json()) as { item: { id: string } }).item.id;
    const media = await request.get(`/api/admin/assets/${asset}/content`);
    expect(media.status()).toBe(200);
    expect(media.headers()["content-type"]).toContain("image/gif");
    expect(media.headers()["cache-control"]).toContain("private");
    expect(await media.body()).toEqual(gif);
    const question = await request.post("/api/admin/questions", {
      headers,
      data: {
        text: "QA phát hành: khi cả hội cùng chọn meme…",
        status: "ACTIVE",
        memeAssetIds: [asset],
        submissionDurationSeconds: 300,
        votingDurationSeconds: 180,
      },
    });
    expect(question.status()).toBe(201);
    const preset = await request.post("/api/admin/presets", {
      headers,
      data: {
        name: `Phase09 acceptance ${mode}`,
        mode,
        questionIds: [((await question.json()) as { item: { id: string } }).item.id],
        votingRules: {
          allowSelfVote: false,
          votesPerPlayer: 1,
          audienceVoting: mode === "COMMUNITY_MODE",
        },
      },
    });
    expect(preset.status()).toBe(201);
    const created = await request.post("/api/admin/sessions", {
      headers,
      data: {
        name: `Phase09 acceptance ${mode}`,
        presetId: ((await preset.json()) as { item: { id: string } }).item.id,
      },
    });
    expect(created.status()).toBe(201);
    const room = (await created.json()) as {
      session: { code: string };
      connection: { url: string; protocols: string[] };
    };
    const admin = new RemoteAdmin(room.connection, baseURL!);
    const firstContext = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    const secondContext = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    const displayContext = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 720 },
    });
    try {
      const first = await firstContext.newPage(),
        second = await secondContext.newPage(),
        display = await displayContext.newPage();
      const code = room.session.code;
      await display.goto(`/display/${code}`);
      const join = new URL(`/play/${code}`, baseURL).href;
      await expect(display.getByRole("link", { name: join, exact: true })).toBeVisible();
      await expect(display.getByRole("img", { name: /QR/ })).toBeVisible();
      for (const [page, name] of [
        [first, "Release fan A"],
        [second, "Release fan B"],
      ] as const) {
        await page.goto(join);
        await page.getByLabel("Biệt danh").fill(name);
        await page.getByRole("button", { name: "Xác nhận tham gia" }).click();
        await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
      }
      await admin.action("START");
      await admin.action("ADVANCE");
      await submit(first);
      await submit(second);
      await first.reload();
      await expect(first.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
      await admin.action("ADVANCE");
      if (mode === "COMMUNITY_MODE") {
        await admin.action("ADVANCE");
        for (const page of [first, second]) {
          await page.getByRole("button", { name: /Bình chọn #/ }).click();
          await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
          await expect(page.getByText("Đã bình chọn · lựa chọn đã khóa.")).toBeVisible();
        }
        await admin.action("ADVANCE");
      } else
        await admin.command({
          type: "SELECT_WINNER",
          submissionId: admin.state!.submissions[0]!.id,
        });
      await expect.poll(() => admin.state?.resultPending).toBe(true);
      await admin.command({
        type: "PUBLISH_RESULT",
        confirmed: true,
        expectedVersion: admin.state!.version,
      });
      await expect(display.getByRole("heading", { name: /thắng vòng này!/ })).toBeVisible();
      await first.reload();
      await display.reload();
      await expect(first.getByText(/thắng vòng này!/)).toBeVisible();
      await expect(display.getByRole("heading", { name: /thắng vòng này!/ })).toBeVisible();
      await admin.action("ADVANCE");
      await admin.action("ADVANCE");
      await expect.poll(() => admin.state?.phase).toBe("FINISHED");
      const audit = await request.get(`/api/admin/sessions/${code}/audit`);
      expect(audit.status()).toBe(200);
      const records = (await audit.json()) as { items: { event_type: string }[] };
      expect(records.items.filter((item) => item.event_type === "PUBLISH_RESULT")).toHaveLength(1);
      // Names/IDs are not printed; retained trial rooms provide an auditable deployment acceptance record.
    } finally {
      admin.socket.close();
      await Promise.all([firstContext.close(), secondContext.close(), displayContext.close()]);
    }
  });
}
