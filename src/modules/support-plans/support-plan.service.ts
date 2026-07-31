import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import type { StudentService } from "../students/student.service.js";
import type {
  CreateSupportPlanInput,
  SupportPlan,
  UpdateSupportPlanInput,
} from "./support-plan.schema.js";
import type { SupportPlanRepository } from "./support-plan.repository.js";
import { canTransitionPlan, isTerminalStatus } from "./support-plan.transitions.js";

export class SupportPlanService {
  constructor(
    private readonly repository: SupportPlanRepository,
    private readonly students: StudentService,
  ) {}

  async create(
    districtId: string,
    studentId: string,
    input: CreateSupportPlanInput,
  ): Promise<SupportPlan> {
    await this.students.get(districtId, studentId);
    const now = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(),
      districtId,
      studentId,
      goal: input.goal,
      startDate: input.startDate,
      reviewDate: input.reviewDate,
      status: input.status,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  async list(districtId: string, studentId: string): Promise<SupportPlan[]> {
    await this.students.get(districtId, studentId);
    return this.repository.listByStudent(districtId, studentId);
  }

  async get(districtId: string, id: string): Promise<SupportPlan> {
    const plan = await this.repository.findById(districtId, id);
    if (!plan) throw new NotFoundError("Support plan");
    return plan;
  }

  async update(
    districtId: string,
    id: string,
    input: UpdateSupportPlanInput,
  ): Promise<SupportPlan> {
    const plan = await this.get(districtId, id);
    const hasEdits = Object.keys(input).some((key) => key !== "version");
    if (isTerminalStatus(plan.status) && hasEdits) {
      throw new ConflictError(
        plan.status === "completed"
          ? "Completed plans can only be reopened explicitly."
          : "Cancelled plans cannot be edited.",
      );
    }
    if (input.status && !canTransitionPlan(plan.status, input.status)) {
      throw new ConflictError(`Cannot move a ${plan.status} plan to ${input.status}.`);
    }
    const reviewDate = input.reviewDate ?? plan.reviewDate;
    if (reviewDate < plan.startDate) {
      throw new ConflictError("Review date must be on or after the start date.");
    }
    const updated: SupportPlan = {
      id: plan.id,
      districtId: plan.districtId,
      studentId: plan.studentId,
      goal: input.goal ?? plan.goal,
      startDate: plan.startDate,
      reviewDate,
      status: input.status ?? plan.status,
      version: plan.version + 1,
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.repository.update(updated, input.version);
    if (!saved) {
      throw new ConflictError(
        "This support plan changed before your update. Refresh and try again.",
      );
    }
    return saved;
  }
}
