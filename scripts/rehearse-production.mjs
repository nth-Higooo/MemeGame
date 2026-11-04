import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url)),
    "test",
    "--config",
    "playwright.production.config.ts",
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    shell: false,
    stdio: "inherit",
    env: {
      ...process.env,
      PRODUCTION_ORIGIN: "http://127.0.0.1:8790",
      PRODUCTION_ACCEPTANCE_ALLOW_WRITES: "true",
      PRODUCTION_ACCEPTANCE_LOCAL_REHEARSAL: "true",
      PRODUCTION_ADMIN_EMAIL: "release-rehearsal@example.test",
      PRODUCTION_ADMIN_PASSWORD: "release-rehearsal-password-123",
    },
  },
);
child.on("error", () => {
  console.error("Cannot start local production-profile rehearsal");
  process.exitCode = 1;
});
child.on("close", (code) => {
  process.exitCode = code ?? 1;
});
