import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit.repository.js";

export type RecordAuditEventInput = {
  districtId?: string;
  actorUserId: string;
  action: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    await this.repository.create({
      id: randomUUID(),
      districtId: input.districtId ?? null,
      actorUserId: input.actorUserId,
      action: input.action,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    });
  }
}
