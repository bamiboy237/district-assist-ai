import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";
import type { SupportPlan } from "./support-plan.schema.js";
type DatabaseClient = Pool | PoolClient;
export interface SupportPlanRepository {
  create(plan: SupportPlan): Promise<SupportPlan>;
  findById(districtId: string, id: string): Promise<SupportPlan | undefined>;
  listByStudent(districtId: string, studentId: string): Promise<SupportPlan[]>;
  update(plan: SupportPlan, expectedVersion: number): Promise<SupportPlan | undefined>;
}
export class PgSupportPlanRepository implements SupportPlanRepository {
  constructor(private readonly db: DatabaseClient = pool) {}
  async create(plan: SupportPlan): Promise<SupportPlan> {
    await this.db.query(
      "INSERT INTO support_plans (id,district_id,student_id,status,goal,start_date,review_date,version,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        plan.id,
        plan.districtId,
        plan.studentId,
        plan.status,
        plan.goal,
        plan.startDate,
        plan.reviewDate,
        plan.version,
        plan.createdAt,
        plan.updatedAt,
      ],
    );
    return plan;
  }
  async findById(districtId: string, id: string): Promise<SupportPlan | undefined> {
    const r = await this.db.query(
      "SELECT * FROM support_plans WHERE district_id=$1 AND id=$2",
      [districtId, id],
    );
    return r.rows[0] ? this.toPlan(r.rows[0]) : undefined;
  }
  async listByStudent(districtId: string, studentId: string): Promise<SupportPlan[]> {
    const r = await this.db.query(
      "SELECT * FROM support_plans WHERE district_id=$1 AND student_id=$2 ORDER BY created_at DESC",
      [districtId, studentId],
    );
    return r.rows.map((row) => this.toPlan(row));
  }
  async update(
    plan: SupportPlan,
    expectedVersion: number,
  ): Promise<SupportPlan | undefined> {
    const r = await this.db.query(
      "UPDATE support_plans SET goal=$3,review_date=$4,status=$5,version=$6,updated_at=$7 WHERE district_id=$1 AND id=$2 AND version=$8 RETURNING *",
      [
        plan.districtId,
        plan.id,
        plan.goal,
        plan.reviewDate,
        plan.status,
        plan.version,
        plan.updatedAt,
        expectedVersion,
      ],
    );
    return r.rows[0] ? this.toPlan(r.rows[0]) : undefined;
  }
  private toPlan(row: Record<string, unknown>): SupportPlan {
    return {
      id: row.id as string,
      districtId: row.district_id as string,
      studentId: row.student_id as string,
      status: row.status as SupportPlan["status"],
      goal: row.goal as string,
      startDate: formatDate(row.start_date),
      reviewDate: formatDate(row.review_date),
      version: row.version as number,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}
export class InMemorySupportPlanRepository implements SupportPlanRepository {
  private readonly plans = new Map<string, SupportPlan>();
  async create(plan: SupportPlan): Promise<SupportPlan> {
    this.plans.set(plan.id, plan);
    return plan;
  }
  async findById(districtId: string, id: string): Promise<SupportPlan | undefined> {
    const plan = this.plans.get(id);
    return plan?.districtId === districtId ? plan : undefined;
  }
  async listByStudent(districtId: string, studentId: string): Promise<SupportPlan[]> {
    return [...this.plans.values()].filter(
      (plan) => plan.districtId === districtId && plan.studentId === studentId,
    );
  }
  async update(plan: SupportPlan, expected: number): Promise<SupportPlan | undefined> {
    const current = this.plans.get(plan.id);
    if (!current || current.version !== expected) return undefined;
    this.plans.set(plan.id, plan);
    return plan;
  }
}
function formatDate(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : (value as string);
}
