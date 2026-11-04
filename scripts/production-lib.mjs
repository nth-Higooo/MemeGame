import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const productionFile = fileURLToPath(
  new URL("../apps/worker/wrangler.production.json", import.meta.url),
);
const nonzero = (value) => /[1-9a-f]/i.test(value);
export const productionConfigSchema = z
  .object({
    name: z.string().regex(/^misthy-meme-party-[a-z0-9-]+$/),
    account_id: z
      .string()
      .regex(/^[0-9a-f]{32}$/i)
      .refine(nonzero, "Configure a real account ID first"),
    main: z.literal("src/index.ts"),
    workers_dev: z.literal(true),
    preview_urls: z.literal(false),
    vars: z
      .object({
        MAX_UPLOAD_BYTES: z
          .string()
          .regex(/^\d+$/)
          .refine((value) => Number(value) > 0 && Number(value) <= 20 * 1024 * 1024),
      })
      .strict(),
    assets: z.object({
      directory: z.literal("../web/dist"),
      binding: z.literal("ASSETS"),
      not_found_handling: z.literal("single-page-application"),
      run_worker_first: z.array(z.string()),
    }),
    durable_objects: z.object({
      bindings: z
        .array(z.object({ name: z.literal("GAME_SESSIONS"), class_name: z.literal("GameSession") }))
        .length(1),
    }),
    exports: z.object({
      GameSession: z.object({ type: z.literal("durable-object"), storage: z.literal("sqlite") }),
    }),
    d1_databases: z
      .array(
        z.object({
          binding: z.literal("DB"),
          database_name: z.string().min(1),
          database_id: z.uuid().refine(nonzero, "Configure a real D1 ID first"),
          migrations_dir: z.literal("migrations"),
        }),
      )
      .length(1),
    r2_buckets: z
      .array(
        z.object({
          binding: z.literal("MEME_BUCKET"),
          bucket_name: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
        }),
      )
      .length(1),
  })
  .passthrough()
  .superRefine((config, ctx) => {
    for (const route of ["/api", "/api/*", "/ws", "/ws/*"])
      if (!config.assets.run_worker_first.includes(route))
        ctx.addIssue({ code: "custom", message: `Worker-first routing required: ${route}` });
    if ("migrations" in config)
      ctx.addIssue({
        code: "custom",
        message: "Use declarative SQLite exports, not a second legacy migration lifecycle",
      });
    if ("unsafe" in config || "services" in config || "containers" in config)
      ctx.addIssue({ code: "custom", message: "Unexpected production service configuration" });
  });

export async function readProductionConfig() {
  return productionConfigSchema.parse(JSON.parse(await readFile(productionFile, "utf8")));
}
export function requireFreeTierAcknowledgement(env = process.env) {
  if (env.CLOUDFLARE_FREE_PLAN_CONFIRMED !== "true" || env.CLOUDFLARE_R2_ALREADY_ENABLED !== "true")
    throw new Error(
      "Stop: verify Workers Free and an already-authorized R2 subscription. This tool never activates billing or upgrades plans.",
    );
}

export function wrangler(args, { capture = false, input, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
        ...args,
      ],
      {
        cwd: root,
        shell: false,
        env: { ...process.env, WRANGLER_SEND_METRICS: "false", ...env },
        stdio: [
          input === undefined ? "ignore" : "pipe",
          capture ? "pipe" : "inherit",
          capture ? "pipe" : "inherit",
        ],
      },
    );
    let output = "";
    // Raw diagnostics may contain environment/account details; never replay captured errors.
    if (capture) {
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.resume();
    }
    if (input !== undefined) child.stdin.end(input);
    child.on("error", () => reject(new Error("Could not start the pinned Wrangler CLI")));
    child.on("close", (code) =>
      code === 0
        ? resolve(output)
        : reject(
            new Error(
              `Wrangler ${args.slice(0, 2).join(" ")} failed (exit ${code}); check local credentials, resource access, and the R2 billing gate.`,
            ),
          ),
    );
  });
}
export async function preflight() {
  const config = await readProductionConfig();
  requireFreeTierAcknowledgement();
  // Read-only: error 10042 is a stop, never a request to auto-activate R2.
  await wrangler(
    [
      "r2",
      "bucket",
      "info",
      config.r2_buckets[0].bucket_name,
      "--json",
      "--config",
      productionFile,
    ],
    { capture: true },
  );
  await wrangler(["d1", "info", "DB", "--config", productionFile], { capture: true });
  return config;
}
