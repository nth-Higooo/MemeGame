import { expect, test, type APIRequestContext } from "@playwright/test";
import { publicSessionStateSchema, type PublicSessionState } from "../../packages/shared/src/index";

class Peer {
  ws: WebSocket;
  state: PublicSessionState | null = null;
  messages: Record<string, unknown>[] = [];
  constructor(connection: { url: string; protocols: string[] }) {
    this.ws = new WebSocket(`ws://127.0.0.1:8790${connection.url}`, connection.protocols);
    this.ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as Record<string, unknown>;
      this.messages.push(message);
      if (message.type === "STATE_SYNC") this.state = publicSessionStateSchema.parse(message.state);
    };
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
}

async function content(request: APIRequestContext, mode: string) {
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
  for (const title of ["Control mint", "Control peach"]) {
    const response = await request.post("/api/admin/assets", {
      headers,
      multipart: {
        title,
        tags: "[]",
        category: "control",
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
  const question = await request.post("/api/admin/questions", {
    headers,
    data: {
      text: "Khi quản trò nói ván cuối…",
      memeAssetIds: assets,
      submissionDurationSeconds: 300,
      votingDurationSeconds: 180,
      status: "ACTIVE",
    },
  });
  expect(question.ok()).toBe(true);
  const preset = await request.post("/api/admin/presets", {
    headers,
    data: {
      name: `Admin ${mode}`,
      mode,
      questionIds: [((await question.json()) as { item: { id: string } }).item.id],
      votingRules: {
        allowSelfVote: false,
        votesPerPlayer: 1,
        audienceVoting: mode === "COMMUNITY_MODE",
      },
    },
  });
  expect(preset.ok()).toBe(true);
  return { assets, preset: ((await preset.json()) as { item: { id: string } }).item.id };
}

for (const mode of ["TALENT_MODE", "COMMUNITY_MODE"]) {
  test(`admin runs complete ${mode} with confirmed results and isolated rehearsal`, async ({
    page,
    request,
    browser,
  }, testInfo) => {
    const fixture = await content(request, mode);
    const peers: Peer[] = [];
    const judgeContext = await browser.newContext({ baseURL: "http://127.0.0.1:8790" });
    try {
      await page.goto("/admin/MT2026");
      await page.getByLabel("Email", { exact: true }).fill("player-e2e@example.test");
      await page.getByLabel("Mật khẩu", { exact: true }).fill("player-e2e-password-123");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await expect(page.getByRole("link", { name: "Content Studio", exact: true })).toBeVisible();
      await expect(
        page
          .getByLabel("Gói câu hỏi / preset", { exact: true })
          .locator(`option[value="${fixture.preset}"]`),
      ).toHaveCount(1);
      await page.getByLabel("Gói câu hỏi / preset", { exact: true }).selectOption(fixture.preset);
      await page.getByLabel("Tên bữa tiệc").fill(`Live ${mode}`);
      await page.getByLabel("Thời gian gửi (giây)", { exact: true }).fill("300");
      await page.getByLabel("Thời gian vote (giây)", { exact: true }).fill("180");
      await page.getByRole("button", { name: "Tạo game", exact: true }).click();
      await page.waitForURL(
        (url) => url.pathname !== "/admin/MT2026" && /^\/admin\/[A-Z0-9]{6}$/.test(url.pathname),
      );
      const code = page.url().split("/").at(-1)!;
      await expect(page.getByRole("button", { name: "Bắt đầu vòng", exact: true })).toBeEnabled();
      await page.context().setOffline(true);
      await page.context().setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await expect(page.getByRole("button", { name: "Bắt đầu vòng", exact: true })).toBeEnabled();
      await page.reload();
      await expect(page.getByRole("button", { name: "Bắt đầu vòng", exact: true })).toBeEnabled();
      await expect(page.getByAltText("QR tham gia phòng")).toBeVisible();
      await expect(page.getByRole("link", { name: "Mở màn hình trình chiếu" })).toHaveAttribute(
        "href",
        `/display/${code}`,
      );
      const ticket = (await (
        await request.post(`/api/admin/sessions/${code}/ticket`, {
          headers: { "X-Requested-With": "misthy-admin" },
          data: { role: "ADMIN" },
        })
      ).json()) as { connection: { url: string; protocols: string[] } };
      const admin = new Peer(ticket.connection);
      peers.push(admin);
      const players: Peer[] = [];
      for (const displayName of ["Minh", "An"]) {
        const joined = (await (
          await request.post(`/api/sessions/${code}/join`, { data: { displayName } })
        ).json()) as { connection: { url: string; protocols: string[] } };
        const peer = new Peer(joined.connection);
        players.push(peer);
        peers.push(peer);
      }
      const display = await page.context().newPage();
      await display.goto(`/display/${code}`);
      await expect(display.getByRole("heading", { name: "Mọi người đã sẵn sàng?" })).toBeVisible();
      const judgePage = await judgeContext.newPage();
      if (mode === "TALENT_MODE") {
        await page.getByLabel("Tên Talent", { exact: true }).fill("Talent");
        await page.getByLabel("Mật khẩu Talent", { exact: true }).fill("talent-e2e-password-123");
        await page.getByRole("button", { name: "Cấu hình game", exact: true }).click();
        await expect(page.getByText(/Đã cấp quyền Talent/)).toBeVisible();
        await judgePage.goto(`/judge/${code}`);
        await judgePage.getByLabel("Mật khẩu Talent").fill("talent-e2e-password-123");
        await judgePage.getByRole("button", { name: "Đăng nhập", exact: true }).click();
        await expect(
          judgePage.getByRole("button", { name: "Đăng xuất", exact: true }),
        ).toBeVisible();
        expect((await judgePage.request.get("/api/admin/sessions")).status()).toBe(401);
        const jt = (await (
          await judgePage.request.post(`/api/judge/${code}/ticket`, {
            headers: { "X-Requested-With": "misthy-admin" },
            data: {},
          })
        ).json()) as { connection: { url: string; protocols: string[] } };
        const judge = new Peer(jt.connection);
        peers.push(judge);
        await judge.command({ type: "ADMIN_ACTION", action: "START" }, false);
      }
      await page.getByRole("button", { name: "Cho màn hình tạm nghỉ", exact: true }).click();
      await expect(display.getByRole("heading", { name: "Bữa tiệc đang tạm nghỉ" })).toBeVisible();
      await page.getByRole("button", { name: "Tiếp tục trình chiếu", exact: true }).click();
      await expect(display.getByRole("heading", { name: "Mọi người đã sẵn sàng?" })).toBeVisible();
      await page.getByRole("button", { name: "Bắt đầu vòng", exact: true }).click();
      await expect(page.getByRole("button", { name: "Mở nhận meme", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Mở nhận meme", exact: true }).click();
      await expect(page.getByRole("button", { name: "Tiết lộ meme", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
      await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
      await players[0]!.command({ type: "SUBMIT_MEME", memeAssetId: fixture.assets[0] });
      await players[1]!.command({ type: "SUBMIT_MEME", memeAssetId: fixture.assets[1] });
      await expect(page.getByText("2 / 2 người đã gửi")).toBeVisible();
      await page.getByRole("button", { name: "Tiết lộ meme", exact: true }).click();
      if (mode === "TALENT_MODE") {
        await judgePage
          .getByRole("button", { name: "Ghi nhận Talent chọn", exact: true })
          .first()
          .click();
        await expect(
          judgePage.getByText("Đã ghi nhận lựa chọn. Đang chờ Admin công bố."),
        ).toBeVisible();
        await expect(
          judgePage.getByRole("button", { name: "Xác nhận và công bố winner", exact: true }),
        ).toHaveCount(0);
      } else {
        await page.getByRole("button", { name: "Mở bình chọn", exact: true }).click();
        await expect.poll(() => admin.state?.phase).toBe("VOTING");
        const submissions = admin.state!.submissions;
        await players[0]!.command({ type: "CAST_VOTE", submissionId: submissions[0]!.id }, false);
        await players[0]!.command({ type: "CAST_VOTE", submissionId: submissions[1]!.id });
        await players[0]!.command({ type: "CAST_VOTE", submissionId: submissions[1]!.id }, false);
        await players[1]!.command({ type: "CAST_VOTE", submissionId: submissions[0]!.id });
        await page.getByRole("button", { name: "Đóng bình chọn", exact: true }).click();
        await expect(page.getByText("Lựa chọn tạm · chưa công bố")).toBeVisible();
        await page.getByRole("button", { name: "Ghi đè lựa chọn tạm", exact: true }).click();
        await page.getByRole("dialog").getByRole("combobox").selectOption(submissions[1]!.id);
        await page.getByLabel("Lý do (ít nhất 5 ký tự)").fill("Talent quyết định hòa sau xem lại");
        await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
      }
      await expect(
        page.getByRole("button", { name: "Xác nhận và công bố winner", exact: true }),
      ).toBeEnabled();
      expect(admin.state?.players.every((p) => p.score === 0)).toBe(true);
      await expect(display.getByRole("heading", { name: /thắng vòng này!/ })).toHaveCount(0);
      await page.getByRole("button", { name: "Xác nhận và công bố winner", exact: true }).click();
      await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
      const winningName = mode === "TALENT_MODE" ? "Minh" : "An";
      await expect(
        display.getByRole("heading", { name: `${winningName} thắng vòng này!` }),
      ).toBeVisible();
      await expect
        .poll(() => admin.state?.players.find((p) => p.displayName === winningName)?.score)
        .toBe(100);
      await admin.command(
        { type: "PUBLISH_RESULT", expectedVersion: admin.state!.version, confirmed: true },
        false,
      );
      if (mode === "TALENT_MODE") {
        await judgePage.request.post(`/api/judge/${code}/logout`, {
          headers: { "X-Requested-With": "misthy-admin" },
          data: {},
        });
        expect(
          (
            await judgePage.request.post(`/api/judge/${code}/ticket`, {
              headers: { "X-Requested-With": "misthy-admin" },
              data: {},
            })
          ).status(),
        ).toBe(401);
      }
      await page.getByRole("button", { name: "Điều chỉnh điểm", exact: true }).first().click();
      await page.getByLabel("Số điểm cộng / trừ").fill("5");
      await page.getByLabel("Lý do (ít nhất 5 ký tự)").fill("Điều chỉnh điểm minh bạch");
      await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
      await expect
        .poll(() => admin.state?.players[0]?.score)
        .toBe(mode === "TALENT_MODE" ? 105 : 5);
      if (mode === "TALENT_MODE")
        await expect(judgePage.getByLabel("Mật khẩu Talent")).toBeVisible();
      await page.getByRole("button", { name: "Hiện bảng điểm", exact: true }).click();
      await page.getByRole("button", { name: "Vòng tiếp / kết thúc", exact: true }).click();
      await expect(page.getByText("Sự kiện đã kết thúc")).toBeVisible();
      await page.screenshot({
        path: `artifacts/phase07/${testInfo.project.name}-${mode}.png`,
        fullPage: true,
      });
      const audit = (await (await request.get(`/api/admin/sessions/${code}/audit`)).json()) as {
        items: { event_type: string; payload_json: string }[];
      };
      expect(audit.items.filter((item) => item.event_type === "PUBLISH_RESULT")).toHaveLength(1);
      expect(
        audit.items.some(
          (item) =>
            item.event_type === "ADJUST_SCORE" &&
            item.payload_json.includes("Điều chỉnh điểm minh bạch"),
        ),
      ).toBe(true);
      if (mode === "COMMUNITY_MODE")
        expect(
          audit.items.some(
            (item) =>
              item.event_type === "OVERRIDE_WINNER" &&
              item.payload_json.includes("Talent quyết định hòa"),
          ),
        ).toBe(true);
      const version = admin.state!.version;
      await page.getByRole("button", { name: "Preview / Dry Run", exact: true }).click();
      await expect(page.getByText("DIỄN TẬP · chỉ trong bộ nhớ trình duyệt")).toBeVisible();
      await page.getByRole("button", { name: "Bắt đầu vòng", exact: true }).click();
      await page.getByRole("button", { name: "Mở nhận meme", exact: true }).click();
      await page.getByRole("button", { name: "Mô phỏng gửi meme", exact: true }).click();
      await page.getByRole("button", { name: "Tiết lộ meme", exact: true }).click();
      const after = await (await request.get(`/api/admin/sessions/${code}/audit`)).json();
      expect(after).toEqual(audit);
      expect(admin.state!.version).toBe(version);
      await page.getByRole("button", { name: "Thoát Dry Run", exact: true }).click();
      await expect(page.getByText("Sự kiện đã kết thúc")).toBeVisible();
    } finally {
      for (const peer of peers) peer.ws.close();
      await judgeContext.close();
    }
  });
}
