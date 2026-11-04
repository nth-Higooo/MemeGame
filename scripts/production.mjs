import { readFile, writeFile } from "node:fs/promises";
import prettier from "prettier";
import {
  productionFile,
  productionConfigSchema,
  readProductionConfig,
  preflight,
  wrangler,
  formatProductionFailure,
} from "./production-lib.mjs";

async function main() {
  const action = process.argv[2];
  if (action === "configure") {
    const original = JSON.parse(await readFile(productionFile, "utf8"));
    const target = {
      ...original,
      account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
      d1_databases: [
        {
          ...original.d1_databases[0],
          database_name:
            process.env.CLOUDFLARE_D1_DATABASE_NAME ?? original.d1_databases[0].database_name,
          database_id: process.env.CLOUDFLARE_D1_DATABASE_ID,
        },
      ],
      r2_buckets: [
        {
          ...original.r2_buckets[0],
          bucket_name: process.env.CLOUDFLARE_R2_BUCKET ?? original.r2_buckets[0].bucket_name,
        },
      ],
    };
    productionConfigSchema.parse(target);
    const prettierOptions = (await prettier.resolveConfig(productionFile)) ?? {};
    const formatted = await prettier.format(`${JSON.stringify(target)}\n`, {
      ...prettierOptions,
      filepath: productionFile,
    });
    await writeFile(productionFile, formatted);
    console.log("Production bindings configured locally. No cloud resources changed.");
    return;
  }
  if (action === "check") {
    await readProductionConfig();
    console.log("Local production config validated; remote D1/R2 resources were not checked.");
    return;
  }
  if (action === "preflight") {
    await preflight();
    console.log("Existing D1/R2 bindings are accessible; no billing settings changed.");
    return;
  }
  if (action === "deploy" || action === "migrate") {
    await preflight();
    await wrangler(
      action === "deploy"
        ? ["deploy", "--config", productionFile]
        : ["d1", "migrations", "apply", "DB", "--remote", "--config", productionFile],
    );
    return;
  }
  throw new Error("Use configure, check, preflight, migrate or deploy. See docs/deployment.md.");
}
main().catch((error) => {
  console.error(
    `Production operation stopped: ${formatProductionFailure(error)} See docs/deployment.md.`,
  );
  process.exitCode = 1;
});
