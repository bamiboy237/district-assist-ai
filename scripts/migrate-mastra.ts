import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../src/database/pool.js";
import { createMastraStorage } from "../src/mastra/storage.js";

export async function migrateMastraStorage(): Promise<void> {
  const storage = createMastraStorage({ init: true });
  await storage.init();
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  migrateMastraStorage()
    .then(async () => {
      console.log("Mastra PostgreSQL storage is ready.");
      await pool.end();
    })
    .catch(async (error: unknown) => {
      console.error("Mastra storage migration failed", error);
      await pool.end();
      process.exitCode = 1;
    });
}
