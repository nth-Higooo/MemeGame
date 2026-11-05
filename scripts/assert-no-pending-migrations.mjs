import { productionFile, wrangler } from "./production-lib.mjs";

async function main() {
  const output = await wrangler(
    ["d1", "migrations", "list", "DB", "--remote", "--config", productionFile],
    { capture: true, captureStderr: true },
  );
  if (!/No migrations to apply/i.test(output))
    throw new Error("Pending or unrecognized remote D1 migration status");
  console.log("Remote D1 has no pending migrations; automatic code deployment may continue.");
}

main().catch(() => {
  console.error(
    "Automatic deployment stopped: remote D1 migration status is pending or could not be confirmed. Use the manual deployment workflow after reviewing and backing up the database.",
  );
  process.exitCode = 1;
});
