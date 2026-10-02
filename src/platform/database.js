export async function openStore(env = process.env) {
  if (env.DATABASE_URL) {
    const { connectPostgres } = await import("./postgres.js");
    const store = connectPostgres(env.DATABASE_URL);
    try {
      await store.assertReady();
      return store;
    } catch (e) {
      await store.close();
      throw e;
    }
  }
  if (env.VERCEL)
    throw Error(
      "Set DATABASE_URL to persistent Postgres storage before hosting the API.",
    );
  const { WorkspaceStore } = await import("./storage.js");
  return new WorkspaceStore(env.AURAT_DB_PATH ?? ".aurat/workspace.sqlite");
}
