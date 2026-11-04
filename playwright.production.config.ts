import { defineConfig } from "@playwright/test";

const origin = new URL(process.env.PRODUCTION_ORIGIN ?? "http://unconfigured.invalid");
const rehearsal =
  process.env.PRODUCTION_ACCEPTANCE_LOCAL_REHEARSAL === "true" &&
  origin.origin === "http://127.0.0.1:8790";
const rehearsalServerPrestarted = process.env.PRODUCTION_REHEARSAL_SERVER_PRESTARTED === "true";
if (
  (origin.protocol !== "https:" && !rehearsal) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  process.env.PRODUCTION_ACCEPTANCE_ALLOW_WRITES !== "true"
)
  throw new Error(
    "Production acceptance is disabled: set a verified HTTPS PRODUCTION_ORIGIN and explicitly allow bounded test writes. See docs/deployment.md.",
  );
if (!process.env.PRODUCTION_ADMIN_EMAIL || !process.env.PRODUCTION_ADMIN_PASSWORD)
  throw new Error(
    "Supply production Admin credentials through a private environment, never command-line arguments or source files.",
  );
if (
  rehearsal &&
  (process.env.PRODUCTION_ADMIN_EMAIL !== "release-rehearsal@example.test" ||
    process.env.PRODUCTION_ADMIN_PASSWORD !== "release-rehearsal-password-123")
)
  throw new Error(
    "The local rehearsal accepts only its fixed local test credentials; never reuse production passwords.",
  );

export default defineConfig({
  testDir: "./tests/production",
  timeout: 90000,
  workers: 1,
  retries: 0,
  reporter: "list",
  ...(rehearsal && !rehearsalServerPrestarted
    ? {
        webServer: {
          command:
            "node node_modules/wrangler/bin/wrangler.js dev --config apps/worker/wrangler.production.json --port 8790 --persist-to .wrangler/production-rehearsal --var ADMIN_SESSION_SECRET:release-rehearsal-only-long-secret --var ADMIN_BOOTSTRAP_PASSWORD:release-rehearsal-bootstrap",
          url: "http://127.0.0.1:8790/api/health",
          reuseExistingServer: false,
        },
      }
    : {}),
  use: {
    baseURL: origin.origin,
    trace: "off",
    screenshot: "off",
    video: "off",
    ignoreHTTPSErrors: false,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
});
