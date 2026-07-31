import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse";
import { Readable } from "node:stream";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import type { Student } from "../students/student.schema.js";
import {
  importStudentRowSchema,
  type ImportError,
  type ImportJob,
} from "./import.schema.js";
import type { ImportRepository, ImportStudentCandidate } from "./import.repository.js";
import { rejectedRowCount } from "./import.repository.js";

const headerMap: Record<string, string> = {
  external_id: "externalId",
  first_name: "firstName",
  last_name: "lastName",
  grade_level: "gradeLevel",
  school_name: "schoolName",
  program_status: "programStatus",
};
const requiredHeaders = Object.keys(headerMap);

export class ImportService {
  constructor(private readonly repository: ImportRepository) {}

  async processCsv(
    districtId: string,
    filename: string,
    csv: Buffer,
  ): Promise<{ job: ImportJob; reused: boolean }> {
    const now = new Date().toISOString();
    const job: ImportJob = {
      id: randomUUID(),
      districtId,
      filename: safeFilename(filename),
      fileChecksum: createHash("sha256").update(csv).digest("hex"),
      status: "processing",
      totalRows: 0,
      acceptedRows: 0,
      rejectedRows: 0,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    const claim = await this.repository.createOrReuse(job);
    if (!claim.created) return { job: claim.job, reused: true };
    const errors: ImportError[] = [];
    const students: ImportStudentCandidate[] = [];
    const seenExternalIds = new Set<string>();
    try {
      const rows = await parseRows(csv);
      for (const row of rows) {
        const parsed = importStudentRowSchema.safeParse(row.record);
        if (!parsed.success) {
          errors.push(
            ...parsed.error.issues.map((issue) => ({
              id: randomUUID(),
              importJobId: job.id,
              rowNumber: row.rowNumber,
              field: issue.path.join(".") || null,
              code: "INVALID_FIELD",
              message: issue.message,
            })),
          );
          continue;
        }
        if (seenExternalIds.has(parsed.data.externalId)) {
          errors.push({
            id: randomUUID(),
            importJobId: job.id,
            rowNumber: row.rowNumber,
            field: "externalId",
            code: "DUPLICATE_IN_FILE",
            message: "External ID appears more than once in this file.",
          });
          continue;
        }
        seenExternalIds.add(parsed.data.externalId);
        students.push({
          rowNumber: row.rowNumber,
          student: toStudent(districtId, parsed.data),
        });
      }
      return {
        job: await this.repository.complete(
          { ...job, totalRows: rows.length, updatedAt: new Date().toISOString() },
          students,
          errors,
        ),
        reused: false,
      };
    } catch (error) {
      const failure = safeFailure(error);
      const failed = {
        ...job,
        status: "failed" as const,
        acceptedRows: 0,
        rejectedRows: rejectedRowCount(errors),
        failureCode: failure.code,
        failureMessage: failure.message,
        updatedAt: new Date().toISOString(),
      };
      try {
        await this.repository.fail(failed, errors);
      } catch {
        // fail best-effort; original error takes precedence
      }
      throw error;
    }
  }
  async get(districtId: string, id: string): Promise<ImportJob> {
    const job = await this.repository.findById(districtId, id);
    if (!job) throw new NotFoundError("Import");
    return job;
  }
  async errors(districtId: string, id: string): Promise<ImportError[]> {
    await this.get(districtId, id);
    return this.repository.listErrors(id);
  }
  async summary(
    districtId: string,
    id: string,
  ): Promise<{
    import: ImportJob;
    categories: Array<{ code: string; count: number }>;
  }> {
    const job = await this.get(districtId, id);
    return { import: job, categories: await this.repository.categoryCounts(id) };
  }
}

async function parseRows(
  input: Buffer,
): Promise<Array<{ rowNumber: number; record: Record<string, string> }>> {
  const records: Array<{ rowNumber: number; record: Record<string, string> }> = [];
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "CSV must be valid UTF-8 text.");
  }
  const parser = parse({
    bom: true,
    info: true,
    trim: true,
    skip_empty_lines: true,
    columns: (headers: string[]) => {
      const normalized = headers.map((header) =>
        header.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_"),
      );
      const duplicates = normalized.filter(
        (header, index) => normalized.indexOf(header) !== index,
      );
      if (duplicates.length > 0) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          `CSV contains duplicate headers: ${[...new Set(duplicates)].join(", ")}.`,
        );
      }
      const missing = requiredHeaders.filter((header) => !normalized.includes(header));
      if (missing.length > 0) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          `CSV is missing required headers: ${missing.join(", ")}.`,
        );
      }
      return normalized.map((header) => headerMap[header] ?? `unknown_${header}`);
    },
  });
  Readable.from([decoded]).pipe(parser);
  for await (const entry of parser) {
    const parsed = entry as {
      info: { lines: number };
      record: Record<string, string>;
    };
    records.push({ rowNumber: parsed.info.lines, record: parsed.record });
  }
  return records;
}

function safeFilename(filename: string): string {
  return filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "students.csv";
}

function toStudent(
  districtId: string,
  input: {
    externalId: string;
    firstName: string;
    lastName: string;
    gradeLevel: number;
    schoolName: string;
    programStatus: string;
  },
): Student {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    districtId,
    ...input,
    programStatus: input.programStatus as Student["programStatus"],
    createdAt: now,
    updatedAt: now,
  };
}

function safeFailure(error: unknown): { code: string; message: string } {
  if (error instanceof AppError) return { code: error.code, message: error.message };
  return {
    code: "INTERNAL_ERROR",
    message: "The import could not be completed.",
  };
}
