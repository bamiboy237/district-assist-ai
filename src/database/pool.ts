import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ...(env.DATABASE_SSL ? { ssl: { rejectUnauthorized: true } } : {}),
  max: 10, // maximum number of connections in the pool
  idleTimeoutMillis: 30000, // idle timeout in milliseconds
});
