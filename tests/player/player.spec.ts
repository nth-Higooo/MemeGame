import { expect, test, type APIRequestContext } from "@playwright/test";

class RealtimePeer {
  ws: WebSocket;
  messages: Record<string, unknown>[] = [];
  constructor(connection: { url: string; protocols: string[] }) {
    this.ws = new WebSocket(`ws://127.0.0.1:8790${connection.url}`, connection.protocols);
    this.ws.onmessage = (event) =>
      this.messages.push(JSON.parse(String(event.data)) as Record<string, unknown>);
  }
  async command(command: Record<string, unknown>) {
    await expect.poll(() => this.ws.readyState).toBe(WebSocket.OPEN);
    const id = crypto.randomUUID();
    this.ws.send(JSON.stringify({ type: "COMMAND", command: { ...command, commandId: id } }));
    await expect
      .poll(() =>
        this.messages.some((message) => message.type === "COMMAND_ACK" && message.commandId === id),
      )
      .toBe(true);
  }
  async action(action: string) {
    await this.command({ type: "ADMIN_ACTION", action });
  }
}

async function pack(
  request: APIRequestContext,
  mode: "COMMUNITY_MODE" | "TALENT_MODE",
  submissionDurationSeconds = 300,
) {
  await request.post("/api/admin/auth/bootstrap", {
    headers: { "X-Bootstrap-Secret": "player-e2e-bootstrap" },
    data: {
      email: "player-e2e@example.test",
      displayName: "Test owner",
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
  const headers = { "X-Requested-With": "misthy-admin" };
  const assets: string[] = [];
  for (const title of ["Original mint", "Original peach"]) {
    const response = await request.post("/api/admin/assets", {
      headers,
      multipart: {
        title,
        tags: '["reaction"]',
        category: "test",
        status: "ACTIVE",
        file: {
          name: "original.gif",
          mimeType: "image/gif",
          buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
        },
      },
    });
    expect(response.ok()).toBe(true);
    assets.push(((await response.json()) as { item: { id: string } }).item.id);
  }
  const questionResponse = await request.post("/api/admin/questions", {
    headers,
    data: {
      text: "Khi bạn hứa chỉ chơi một ván…",
      memeAssetIds: assets,
      submissionDurationSeconds,
      votingDurationSeconds: 180,
      status: "ACTIVE",
    },
  });
  expect(questionResponse.ok()).toBe(true);
  const question = (await questionResponse.json()) as { item: { id: string } };
  const presetResponse = await request.post("/api/admin/presets", {
    headers,
    data: {
      name: "Player journey",
      mode,
      questionIds: [question.item.id],
      votingRules: {
        allowSelfVote: false,
        votesPerPlayer: 1,
        audienceVoting: mode === "COMMUNITY_MODE",
      },
    },
  });
  expect(presetResponse.ok()).toBe(true);
  const preset = (await presetResponse.json()) as { item: { id: string } };
  const sessionResponse = await request.post("/api/admin/sessions", {
    headers,
    data: { name: "Player test party", presetId: preset.item.id, manualControl: false },
  });
  expect(sessionResponse.ok()).toBe(true);
  const session = (await sessionResponse.json()) as {
    session: { code: string };
    connection: { url: string; protocols: string[] };
  };
  return { code: session.session.code, admin: new RealtimePeer(session.connection), assets };
}

test("Community player joins, restores, replaces, votes once, and sees final summary", async ({
  page,
  request,
  context,
}) => {
  const { code, admin, assets } = await pack(request, "COMMUNITY_MODE");
  let other: RealtimePeer | undefined;
  try {
    await page.goto(`/play/${code}`);
    await page.getByLabel("Biệt danh").fill("Người chơi mobile");
    await page.getByRole("button", { name: "Xác nhận tham gia" }).click();
    await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Chào Người chơi mobile.", { exact: false })).toBeVisible();
    const secondTab = await context.newPage();
    await secondTab.goto(`/play/${code}`);
    await expect(secondTab.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
    await secondTab.close();
    const joined = (await (
      await request.post(`/api/sessions/${code}/join`, { data: { displayName: "Bạn đồng hành" } })
    ).json()) as { reconnectToken: string; connection: { url: string; protocols: string[] } };
    expect((await request.get(`/api/sessions/${code}/content/${assets[0]}`)).status()).toBe(401);
    expect(
      (
        await request.get(`/api/sessions/${code}/content/${assets[0]}`, {
          headers: { Authorization: `Bearer ${joined.reconnectToken}` },
        })
      ).status(),
    ).toBe(403);
    other = new RealtimePeer(joined.connection);
    await admin.action("START");
    await expect(page.getByText("Khi bạn hứa chỉ chơi một ván…")).toBeVisible();
    await expect(page.getByText(/Người chơi mobile · Vòng 1 \/ 1/)).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByLabel("Tìm meme")).toBeVisible();
    await page.setViewportSize({ width: 320, height: 700 });
    await expect(page.getByAltText("Original mint")).toBeVisible();
    await page.screenshot({ path: "artifacts/phase05/player-selection.png", fullPage: true });
    await page.getByRole("button", { name: "Chọn meme Original mint", exact: true }).click();
    await page.getByRole("button", { name: "Gửi meme này", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Chọn meme Original peach", exact: true }).click();
    await page.getByRole("button", { name: "Thay meme đã gửi", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Thay meme đã gửi", exact: true }),
    ).toBeDisabled();
    await other.command({ type: "SUBMIT_MEME", memeAssetId: assets[0] });
    await context.setOffline(true);
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText(/Người chơi mobile · Vòng 1 \/ 1/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByText(/Đang trình chiếu meme/)).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByRole("button", { name: "Meme của bạn", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: /Bình chọn #/ }).click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.getByText("Đã bình chọn · lựa chọn đã khóa.")).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByText("Bạn đồng hành thắng vòng này!")).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByRole("heading", { name: "Bảng xếp hạng", exact: true })).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByRole("heading", { name: "Bữa tiệc meme đã kết thúc!" })).toBeVisible();
    await expect(
      page.getByText("1 meme đã gửi · 1 lượt bình chọn · 0 vòng chiến thắng"),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    admin.ws.close();
    other?.ws.close();
  }
});

test("round deadline closes player actions automatically", async ({ page, request }) => {
  const { code, admin } = await pack(request, "COMMUNITY_MODE", 10);
  try {
    await page.goto(`/play/${code}`);
    await page.getByLabel("Biệt danh").fill("Deadline fan");
    await page.getByRole("button", { name: "Xác nhận tham gia" }).click();
    await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
    await admin.action("START");
    await admin.action("ADVANCE");
    await page.getByRole("button", { name: "Chọn meme Original mint", exact: true }).click();
    await expect(page.getByRole("button", { name: "Gửi meme này", exact: true })).toBeEnabled();
    await expect(page.getByText("Chưa có meme để trình chiếu.")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: "Gửi meme này", exact: true })).toHaveCount(0);
  } finally {
    admin.ws.close();
  }
});

test("Talent player waits for decision and sees winning score", async ({ page, request }) => {
  const { code, admin } = await pack(request, "TALENT_MODE");
  try {
    await page.goto(`/play/${code}`);
    await page.getByLabel("Biệt danh").fill("Talent fan");
    await page.getByRole("button", { name: "Xác nhận tham gia" }).click();
    await expect(page.getByRole("heading", { name: "Bạn đã vào phòng!" })).toBeVisible();
    await admin.action("START");
    await admin.action("ADVANCE");
    await page.getByRole("button", { name: "Chọn meme Original mint", exact: true }).click();
    await page.getByRole("button", { name: "Gửi meme này" }).click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.getByText("Đã gửi meme.", { exact: false })).toBeVisible();
    await admin.action("ADVANCE");
    await expect(page.getByText(/Đang trình chiếu meme/)).toBeVisible();
    const state = admin.messages.filter((item) => item.type === "STATE_SYNC").at(-1) as {
      state: { submissions: { id: string }[] };
    };
    await admin.command({ type: "SELECT_WINNER", submissionId: state.state.submissions[0]!.id });
    await expect(page.getByText("Talent fan thắng vòng này!")).toBeVisible();
    await expect(page.getByText("Điểm của bạn: 100", { exact: true })).toBeVisible();
  } finally {
    admin.ws.close();
  }
});

test("unknown room reports a clear error", async ({ page }) => {
  await page.goto("/play/ZZZZZZ");
  await expect(page.getByText("Không tìm thấy phòng.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận tham gia" })).toBeDisabled();
});
