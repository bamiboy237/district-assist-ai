import { InMemoryStore, type MastraCompositeStore } from "@mastra/core/storage";
import { PostgresStore } from "@mastra/pg";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";

export function createMastraStorage(options?: { init: boolean }): MastraCompositeStore {
  if (env.NODE_ENV === "test") {
    return new InMemoryStore({ id: "district-assist-test" });
  }
  return new PostgresStore({
    id: "district-assist",
    pool,
    schemaName: "mastra",
    disableInit: options?.init === false || env.NODE_ENV === "production",
  });
}
// PG storage kept for future memory/suspend-resume support.
