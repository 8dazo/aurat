import { existsSync } from "node:fs";
import { connectPostgres, migratePostgres } from "./postgres.js";
let store;
try {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw Error("Set DATABASE_URL_UNPOOLED to the direct Postgres URL");
  if (new URL(url).hostname.includes("-pooler"))
    throw Error("Use the direct URL for migrations and SQLite import");
  store = connectPostgres(url);
  await migratePostgres(store);
  if (process.argv.includes("--import-sqlite")) {
    const path = process.env.AURAT_DB_PATH ?? ".aurat/workspace.sqlite";
    if (!existsSync(path)) throw Error("SQLite source database does not exist");
    const { WorkspaceStore } = await import("./storage.js");
    const source = new WorkspaceStore(path);
    try {
      const counts = await store.importSnapshot(await source.exportSnapshot());
      console.log("Imported workspace:", JSON.stringify(counts));
    } finally {
      source.close();
    }
  } else console.log("Postgres workspace migrations applied.");
} catch (e) {
  // Connection errors can contain hosts/usernames; never print the URL or driver details.
  console.error(
    [
      "Set DATABASE_URL_UNPOOLED to the direct Postgres URL",
      "Use the direct URL for migrations and SQLite import",
      "SQLite source database does not exist",
      "Import requires an empty Postgres workspace",
    ].includes(e.message)
      ? e.message
      : "Database migration/import failed; check connectivity and the direct database URL.",
  );
  process.exitCode = 1;
} finally {
  if (store) await store.close();
}
