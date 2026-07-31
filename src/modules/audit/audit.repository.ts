import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";

type DatabaseClient = Pool | PoolClient;

export type AuditEvent = {
  id: string;
  districtId: string | null;
  actorUserId: string;
  action: string;
  requestId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export interface AuditRepository {
  create(event: AuditEvent): Promise<void>;
}

export class PgAuditRepository implements AuditRepository {
  constructor(private readonly db: DatabaseClient = pool) {}

  async create(event: AuditEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_events
       (id, district_id, actor_user_id, action, request_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        event.id,
        event.districtId,
        event.actorUserId,
        event.action,
        event.requestId,
        JSON.stringify(event.metadata),
        event.createdAt,
      ],
    );
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  readonly events: AuditEvent[] = [];

  async create(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}
