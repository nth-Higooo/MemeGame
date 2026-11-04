import { expect, test, type APIRequestContext } from "@playwright/test";

class Peer {
  ws: WebSocket;
  messages: Record<string, unknown>[] = [];
  constructor(connection: { url: string; protocols: string[] }) {
    this.ws = new WebSocket(`ws://127.0.0.1:8790${connection.url}`, connection.protocols);
    this.ws.onmessage = (event) =>
      this.messages.push(JSON.parse(String(event.data)) as Record<string, unknown>);
  }
  async command(command: Record<string, unknown>, accepted = true) {
    await expect.poll(() => this.ws.readyState).toBe(WebSocket.OPEN);
    const commandId = crypto.randomUUID();
    this.ws.send(JSON.stringify({ type: "COMMAND", command: { ...command, commandId } }));
    await expect
      .poll(() =>
        this.messages.some(
          (message) =>
            message.commandId === commandId &&
            message.type === (accepted ? "COMMAND_ACK" : "ERROR"),
        ),
      )
      .toBe(true);
  }
  async action(action: string) {
    await this.command({ type: "ADMIN_ACTION", action });
  }
}
async function createRoom(request: APIRequestContext, mode = "TALENT_MODE") {
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
  const upload = await request.post("/api/admin/assets", {
    headers,
    multipart: {
      title: "Original presentation GIF",
      tags: "[]",
      category: "stage",
      status: "ACTIVE",
      file: {
        name: "stage.gif",
        mimeType: "image/gif",
        buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
      },
    },
  });
  expect(upload.ok()).toBe(true);
  const asset = ((await upload.json()) as { item: { id: string } }).item.id;
  const q = await request.post("/api/admin/questions", {
    headers,
    data: {
      text: "Khi bạn hứa chỉ chơi một ván…",
      memeAssetIds: [asset],
      submissionDurationSeconds: 300,
      votingDurationSeconds: 180,
      status: "ACTIVE",
    },
  });
  expect(q.ok()).toBe(true);
  const question = ((await q.json()) as { item: { id: string } }).item.id;
  const p = await request.post("/api/admin/presets", {
    headers,
    data: {
      name: "Presentation pack",
      mode,
      questionIds: [question],
      votingRules: {
        allowSelfVote: false,
        votesPerPlayer: 1,
        audienceVoting: mode === "COMMUNITY_MODE",
      },
    },
  });
  expect(p.ok()).toBe(true);
  const preset = ((await p.json()) as { item: { id: string } }).item.id;
  const s = await request.post("/api/admin/sessions", {
    headers,
    data: { name: "MisThy Birthday Party", presetId: preset },
  });
  expect(s.ok()).toBe(true);
  const session = (await s.json()) as {
    session: { code: string };
    connection: { url: string; protocols: string[] };
  };
  const join = await request.post(`/api/sessions/${session.session.code}/join`, {
    data: { displayName: "Ngôi sao meme" },
  });
  expect(join.ok()).toBe(true);
  const player = (await join.json()) as { connection: { url: string; protocols: string[] } };
  return {
    code: session.session.code,
    asset,
    admin: new Peer(session.connection),
    player: new Peer(player.connection),
  };
}

test("live presentation stays read-only, hides early media, restores and celebrates", async ({
  page,
  request,
  browserName,
}, testInfo) => {
  const room = await createRoom(request);
  const otherJoined = (await (
    await request.post(`/api/sessions/${room.code}/join`, { data: { displayName: "Khách mời" } })
  ).json()) as { connection: { url: string; protocols: string[] } };
  const other = new Peer(otherJoined.connection);
  const sent: string[] = [];
  page.on("websocket", (socket) =>
    socket.on("framesent", (frame) => sent.push(String(frame.payload))),
  );
  try {
    await page.goto(`/display/${room.code}`);
    await expect(page.getByRole("heading", { name: "Mọi người đã sẵn sàng?" })).toBeVisible();
    await expect(page.getByAltText("Mã QR tham gia phòng")).toHaveAttribute(
      "src",
      /^data:image\/png;base64,/,
    );
    await expect(page.getByTestId("join-link")).toHaveAttribute(
      "href",
      `http://127.0.0.1:8790/play/${room.code}`,
    );
    await page.screenshot({ path: `artifacts/phase06/${testInfo.project.name}-lobby.png` });
    if (browserName === "chromium") {
      await page.getByRole("button", { name: "Toàn màn hình", exact: true }).focus();
      await page.getByRole("button", { name: "Toàn màn hình", exact: true }).click();
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
      await page.keyboard.press("f");
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
    }
    const ticket = (await (
      await request.post(`/api/sessions/${room.code}/display-ticket`)
    ).json()) as { connection: { url: string; protocols: string[] } };
    const viewer = new Peer(ticket.connection);
    await viewer.command({ type: "ADMIN_ACTION", action: "START" }, false);
    viewer.ws.close();
    expect(
      (await request.get(`/api/sessions/${room.code}/display-media/${room.asset}`)).status(),
    ).toBe(401);
    expect(
      (
        await request.get(`/api/sessions/${room.code}/display-media/${room.asset}`, {
          headers: { Authorization: `Bearer ${ticket.connection.protocols[1]}` },
        })
      ).status(),
    ).toBe(403);
    await room.admin.action("START");
    await expect(page.getByText("Bữa tiệc meme bắt đầu!")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Khi bạn hứa chỉ chơi một ván…" }),
    ).toBeVisible();
    await room.admin.action("ADVANCE");
    await room.player.command({ type: "SUBMIT_MEME", memeAssetId: room.asset });
    await other.command({ type: "SUBMIT_MEME", memeAssetId: room.asset });
    await expect(page.getByText("2 / 2 meme đã gửi")).toBeVisible();
    await expect(page.getByTestId("stage-media")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("2 / 2 meme đã gửi")).toBeVisible();
    await room.admin.action("PAUSE");
    await expect(page.getByText("Bữa tiệc đang tạm nghỉ")).toBeVisible();
    await room.admin.action("RESUME");
    await room.admin.action("ADVANCE");
    await expect(
      page.getByRole("heading", { name: "Sân khấu của những chiếc meme" }),
    ).toBeVisible();
    await expect(page.locator(".presentation-carousel figure img")).toBeVisible();
    await expect(page.locator(".presentation-body")).toHaveCSS("transform", "none");
    const before = await page.locator(".presentation-thumbnails").boundingBox();
    await expect(page.locator(".presentation-carousel figcaption")).toContainText("Meme 2 / 2", {
      timeout: 8000,
    });
    const after = await page.locator(".presentation-thumbnails").boundingBox();
    expect(Math.abs((before?.y ?? 0) - (after?.y ?? 0))).toBeLessThan(2);
    await page.screenshot({ path: `artifacts/phase06/${testInfo.project.name}-reveal.png` });
    expect(
      (
        await request.get(`/api/sessions/${room.code}/display-media/${room.asset}`, {
          headers: { Authorization: `Bearer ${ticket.connection.protocols[1]}` },
        })
      ).status(),
    ).toBe(200);
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText("Kết nối gián đoạn · đang đồng bộ lại")).toBeVisible();
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText("Kết nối gián đoạn · đang đồng bộ lại")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Sân khấu của những chiếc meme" }),
    ).toBeVisible();
    const state = room.admin.messages.filter((message) => message.type === "STATE_SYNC").at(-1) as {
      state: { submissions: { id: string }[] };
    };
    await room.admin.command({
      type: "SELECT_WINNER",
      submissionId: state.state.submissions[0]!.id,
    });
    await expect(
      page.getByRole("heading", { name: "Ngôi sao meme thắng vòng này!" }),
    ).toBeVisible();
    await room.admin.action("ADVANCE");
    await expect(page.getByRole("heading", { name: "Những ngôi sao của bữa tiệc" })).toBeVisible();
    await room.admin.action("ADVANCE");
    await expect(page.getByRole("heading", { name: "Cảm ơn vì đã quẩy hết mình!" })).toBeVisible();
    await page.screenshot({ path: `artifacts/phase06/${testInfo.project.name}-final.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      sent.every((value) =>
        ["PING", "CLIENT_READY"].includes((JSON.parse(value) as { type: string }).type),
      ),
    ).toBe(true);
  } finally {
    room.admin.ws.close();
    room.player.ws.close();
    other.ws.close();
  }
});

test("Community voting and reduced-motion media work at fallback sizes", async ({
  page,
  request,
}) => {
  const room = await createRoom(request, "COMMUNITY_MODE");
  const joined = (await (
    await request.post(`/api/sessions/${room.code}/join`, { data: { displayName: "Voter" } })
  ).json()) as { connection: { url: string; protocols: string[] } };
  const voter = new Peer(joined.connection);
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/display/${room.code}`);
    await expect(page.getByRole("heading", { name: "Mọi người đã sẵn sàng?" })).toBeVisible();
    await room.admin.action("START");
    await room.admin.action("ADVANCE");
    await room.player.command({ type: "SUBMIT_MEME", memeAssetId: room.asset });
    await room.admin.action("ADVANCE");
    await expect(page.locator(".presentation-carousel figure canvas")).toBeVisible();
    await room.admin.action("ADVANCE");
    await expect(
      page.getByRole("heading", { name: "Meme nào xứng đáng chiến thắng?" }),
    ).toBeVisible();
    await expect(page.getByText("0 / 2 người đã bình chọn")).toBeVisible();
    const latest = room.admin.messages
      .filter((message) => message.type === "STATE_SYNC")
      .at(-1) as { state: { submissions: { id: string }[] } };
    await voter.command({ type: "CAST_VOTE", submissionId: latest.state.submissions[0]!.id });
    await expect(page.getByText("1 / 2 người đã bình chọn")).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 600, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Meme nào xứng đáng chiến thắng?" }),
    ).toBeVisible();
  } finally {
    room.admin.ws.close();
    room.player.ws.close();
    voter.ws.close();
  }
});
