import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";

type DatabaseClient = Pool | PoolClient;

export interface PlatformAdminRepository {
  add(userId: string): Promise<void>;
  has(userId: string): Promise<boolean>;
}

export class PgPlatformAdminRepository implements PlatformAdminRepository {
  constructor(private readonly db: DatabaseClient = pool) {}

  async add(userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO platform_administrators (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }

  async has(userId: string): Promise<boolean> {
    const result = await this.db.query(
      "SELECT 1 FROM platform_administrators WHERE user_id = $1",
      [userId],
    );
    return Boolean(result.rowCount);
  }
}

export class InMemoryPlatformAdminRepository implements PlatformAdminRepository {
  private readonly userIds = new Set<string>();

  async add(userId: string): Promise<void> {
    this.userIds.add(userId);
  }

  async has(userId: string): Promise<boolean> {
    return this.userIds.has(userId);
  }
}
