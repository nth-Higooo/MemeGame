import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const wrangler = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const workerConfig = "apps/worker/wrangler.production.json";
const persistence = ".wrangler/production-rehearsal";
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  PRODUCTION_ORIGIN: "http://127.0.0.1:8790",
  PRODUCTION_ACCEPTANCE_ALLOW_WRITES: "true",
  PRODUCTION_ACCEPTANCE_LOCAL_REHEARSAL: "true",
  PRODUCTION_REHEARSAL_SERVER_PRESTARTED: "true",
  PRODUCTION_ADMIN_EMAIL: "release-rehearsal@example.test",
  PRODUCTION_ADMIN_PASSWORD: "release-rehearsal-password-123",
};

function start(binary, args, childEnv = env) {
  const child = spawn(binary, args, {
    cwd: root,
    shell: false,
    detached: process.platform !== "win32",
    stdio: "inherit",
    env: childEnv,
  });
  return child;
}

function run(binary, args, childEnv = env) {
  return new Promise((resolve, reject) => {
    const child = start(binary, args, childEnv);
    child.on("error", () => reject(new Error("Could not start the local production rehearsal")));
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Local production rehearsal stopped (exit ${code})`)),
    );
  });
}

async function waitForHealth(server) {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (server.exitCode !== null)
      throw new Error(`Local production Worker stopped during startup (exit ${server.exitCode})`);
    try {
      const response = await fetch("http://127.0.0.1:8790/api/health", {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) return;
    } catch {
      // Wrangler can take several seconds to start its local runtime.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local production Worker did not become healthy within 30 seconds");
}

async function stop(server) {
  if (server.exitCode !== null) return;
  const closed = new Promise((resolve) => server.once("close", resolve));
  if (process.platform === "win32") {
    const command = [
      "$expected = (Resolve-Path -LiteralPath 'node_modules/@cloudflare/workerd-windows-64/bin/workerd.exe').Path",
      "$line = netstat -ano -p tcp | Select-String '127\\.0\\.0\\.1:8790\\s+0\\.0\\.0\\.0:0\\s+LISTENING' | Select-Object -First 1",
      "if ($line) { $id = [int](($line.ToString().Trim() -split '\\s+')[-1]); $process = Get-Process -Id $id -ErrorAction SilentlyContinue; if ($process -and $process.Path -eq $expected) { Stop-Process -Id $id -Force } }",
      `$runner = Get-Process -Id ${server.pid} -ErrorAction SilentlyContinue; if ($runner -and $runner.ProcessName -eq 'node') { Stop-Process -Id ${server.pid} -Force }`,
    ].join("; ");
    await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], env).catch(
      () => {},
    );
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // The process may already have exited.
    }
  }
  await Promise.race([
    closed,
    new Promise((resolve) => {
      setTimeout(() => {
        if (process.platform !== "win32") {
          try {
            process.kill(-server.pid, "SIGKILL");
          } catch {
            // The process group may already be gone.
          }
        }
        resolve();
      }, 3000);
    }),
  ]);
}

let server;
try {
  // Initialize isolated local D1 before Wrangler dev starts against the same store.
  await run(process.execPath, [
    wrangler,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    workerConfig,
    "--persist-to",
    persistence,
  ]);
  server = start(process.execPath, [
    wrangler,
    "dev",
    "--config",
    workerConfig,
    "--port",
    "8790",
    "--persist-to",
    persistence,
    "--var",
    "ADMIN_SESSION_SECRET:release-rehearsal-only-long-secret",
    "--var",
    "ADMIN_BOOTSTRAP_PASSWORD:release-rehearsal-bootstrap",
  ]);
  await waitForHealth(server);
  await run(process.execPath, [
    fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url)),
    "test",
    "--config",
    "playwright.production.config.ts",
  ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local production rehearsal failed");
  process.exitCode = 1;
} finally {
  if (server) await stop(server);
}
