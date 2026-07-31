import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import { InMemoryStudentRepository } from "../students/student.repository.js";
import { InMemoryImportRepository } from "./import.repository.js";
import type { ImportJob } from "./import.schema.js";
import { ImportService } from "./import.service.js";

const districtId = "00000000-0000-4000-8000-000000000001";
const headers =
  "external_id,first_name,last_name,grade_level,school_name,program_status";

describe("ImportService", () => {
  it("counts rejected rows rather than individual validation issues", async () => {
    const repository = new InMemoryImportRepository(new InMemoryStudentRepository());
    const service = new ImportService(repository);
    const csv = Buffer.from(
      [
        headers,
        "S-1,Ada,Learner,7,North Middle,active",
        "S-2,,,13,North Middle,monitoring",
      ].join("\n"),
    );

    const result = await service.processCsv(districtId, "students.csv", csv);
    const errors = await repository.listErrors(result.job.id);

    expect(result).toMatchObject({
      reused: false,
      job: {
        status: "completed",
        totalRows: 2,
        acceptedRows: 1,
        rejectedRows: 1,
      },
    });
    expect(errors.length).toBeGreaterThan(1);
    expect(new Set(errors.map((error) => error.rowNumber))).toEqual(new Set([3]));
  });

  it("reuses a completed job when the same district retries identical content", async () => {
    const students = new InMemoryStudentRepository();
    const repository = new InMemoryImportRepository(students);
    const service = new ImportService(repository);
    const csv = Buffer.from(
      [headers, "S-1,Ada,Learner,7,North Middle,active"].join("\n"),
    );

    const first = await service.processCsv(districtId, "first-name.csv", csv);
    const retry = await service.processCsv(districtId, "renamed.csv", csv);
    const storedStudents = await students.list(districtId, { limit: 10 });

    expect(retry.reused).toBe(true);
    expect(retry.job.id).toBe(first.job.id);
    expect(retry.job.filename).toBe("first-name.csv");
    expect(storedStudents).toHaveLength(1);
  });

  it("durably records a safe reason when parsing fails", async () => {
    const repository = new CapturingImportRepository(new InMemoryStudentRepository());
    const service = new ImportService(repository);
    const csv = Buffer.from("external_id,first_name\nS-1,Ada");

    await expect(
      service.processCsv(districtId, "broken.csv", csv),
    ).rejects.toBeInstanceOf(AppError);

    const job = await repository.findById(districtId, repository.lastJobId);
    expect(job).toMatchObject({
      status: "failed",
      acceptedRows: 0,
      failureCode: "VALIDATION_ERROR",
    });
    expect(job?.failureMessage).toContain("missing required headers");
  });

  it("does not expose an unexpected persistence error in the failed job", async () => {
    const repository = new FailingImportRepository(new InMemoryStudentRepository());
    const service = new ImportService(repository);
    const csv = Buffer.from(
      [headers, "S-1,Ada,Learner,7,North Middle,active"].join("\n"),
    );

    await expect(service.processCsv(districtId, "students.csv", csv)).rejects.toThrow(
      "database password leaked",
    );

    const job = await repository.findById(districtId, repository.lastJobId);
    expect(job).toMatchObject({
      status: "failed",
      acceptedRows: 0,
      failureCode: "INTERNAL_ERROR",
      failureMessage: "The import could not be completed.",
    });
  });
});

class CapturingImportRepository extends InMemoryImportRepository {
  lastJobId = "";

  override async createOrReuse(
    job: ImportJob,
  ): Promise<{ job: ImportJob; created: boolean }> {
    this.lastJobId = job.id;
    return super.createOrReuse(job);
  }
}

class FailingImportRepository extends CapturingImportRepository {
  override async complete(): Promise<ImportJob> {
    throw new Error("database password leaked");
  }
}
