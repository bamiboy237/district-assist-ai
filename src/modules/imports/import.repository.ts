import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";
import type { Student } from "../students/student.schema.js";
import type { StudentRepository } from "../students/student.repository.js";
import type { ImportError, ImportJob } from "./import.schema.js";

type DatabaseClient = Pool | PoolClient;
export type ImportStudentCandidate = {
  rowNumber: number;
  student: Student;
};

export interface ImportRepository {
  createOrReuse(job: ImportJob): Promise<{ job: ImportJob; created: boolean }>;
  update(job: ImportJob): Promise<ImportJob>;
  complete(
    job: ImportJob,
    students: ImportStudentCandidate[],
    errors: ImportError[],
  ): Promise<ImportJob>;
  fail(job: ImportJob, errors: ImportError[]): Promise<ImportJob>;
  findById(districtId: string, id: string): Promise<ImportJob | undefined>;
  addErrors(errors: ImportError[]): Promise<void>;
  listErrors(importJobId: string): Promise<ImportError[]>;
  categoryCounts(importJobId: string): Promise<Array<{ code: string; count: number }>>;
}
export class PgImportRepository implements ImportRepository {
  constructor(private readonly db: DatabaseClient = pool) {}

  async createOrReuse(job: ImportJob): Promise<{ job: ImportJob; created: boolean }> {
    await this.db.query(
      `UPDATE import_jobs
       SET status='failed', failure_code='ABANDONED', failure_message='Abandoned after restart.', updated_at=NOW()
       WHERE district_id=$1 AND file_checksum=$2 AND status IN ('received','processing') AND updated_at < NOW() - INTERVAL '15 minutes'`,
      [job.districtId, job.fileChecksum],
    );
    const inserted = await this.db.query(
      `INSERT INTO import_jobs
         (id, district_id, filename, file_checksum, status, total_rows,
          accepted_rows, rejected_rows, failure_code, failure_message,
          created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (district_id, file_checksum)
          WHERE file_checksum IS NOT NULL AND status <> 'failed'
        DO NOTHING
        RETURNING *`,
      [
        job.id,
        job.districtId,
        job.filename,
        job.fileChecksum,
        job.status,
        job.totalRows,
        job.acceptedRows,
        job.rejectedRows,
        job.failureCode,
        job.failureMessage,
        job.createdAt,
        job.updatedAt,
      ],
    );
    if (inserted.rows[0]) return { job: this.toJob(inserted.rows[0]), created: true };

    const existing = await this.db.query(
      `SELECT * FROM import_jobs
       WHERE district_id = $1 AND file_checksum = $2 AND status <> 'failed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [job.districtId, job.fileChecksum],
    );
    if (!existing.rows[0])
      throw new Error("Import idempotency conflict could not be resolved.");
    return { job: this.toJob(existing.rows[0]), created: false };
  }

  async update(job: ImportJob): Promise<ImportJob> {
    await this.updateWithClient(this.db, job);
    return job;
  }

  async complete(
    job: ImportJob,
    students: ImportStudentCandidate[],
    errors: ImportError[],
  ): Promise<ImportJob> {
    return this.withTransaction(async (client) => {
      const finalErrors = [...errors];
      let acceptedRows = 0;

      for (const candidate of students) {
        const student = candidate.student;
        const result = await client.query(
          `INSERT INTO students
             (id, district_id, external_id, first_name, last_name, grade_level,
              school_name, program_status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (district_id, external_id) DO NOTHING
           RETURNING id`,
          [
            student.id,
            student.districtId,
            student.externalId,
            student.firstName,
            student.lastName,
            student.gradeLevel,
            student.schoolName,
            student.programStatus,
            student.createdAt,
            student.updatedAt,
          ],
        );
        if (result.rowCount === 1) {
          acceptedRows += 1;
        } else {
          finalErrors.push(duplicateExistingError(job.id, candidate.rowNumber));
        }
      }

      await this.insertErrors(client, finalErrors);
      const completed = {
        ...job,
        status: "completed" as const,
        acceptedRows,
        rejectedRows: rejectedRowCount(finalErrors),
        failureCode: null,
        failureMessage: null,
        updatedAt: new Date().toISOString(),
      };
      await this.updateWithClient(client, completed);
      return completed;
    });
  }

  async fail(job: ImportJob, errors: ImportError[]): Promise<ImportJob> {
    return this.withTransaction(async (client) => {
      await this.insertErrors(client, errors);
      await this.updateWithClient(client, job);
      return job;
    });
  }

  async findById(districtId: string, id: string): Promise<ImportJob | undefined> {
    const r = await this.db.query(
      "SELECT * FROM import_jobs WHERE district_id=$1 AND id=$2",
      [districtId, id],
    );
    return r.rows[0] ? this.toJob(r.rows[0]) : undefined;
  }
  async addErrors(errors: ImportError[]): Promise<void> {
    await this.insertErrors(this.db, errors);
  }

  private async insertErrors(
    client: DatabaseClient,
    errors: ImportError[],
  ): Promise<void> {
    for (const error of errors) {
      await client.query(
        "INSERT INTO import_errors (id,import_job_id,row_number,field,code,message) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          error.id,
          error.importJobId,
          error.rowNumber,
          error.field,
          error.code,
          error.message,
        ],
      );
    }
  }
  async listErrors(importJobId: string): Promise<ImportError[]> {
    const r = await this.db.query(
      "SELECT * FROM import_errors WHERE import_job_id=$1 ORDER BY row_number ASC",
      [importJobId],
    );
    return r.rows.map((row) => this.toError(row));
  }
  async categoryCounts(
    importJobId: string,
  ): Promise<Array<{ code: string; count: number }>> {
    const r = await this.db.query(
      "SELECT code, COUNT(*)::int AS count FROM import_errors WHERE import_job_id=$1 GROUP BY code ORDER BY count DESC, code ASC",
      [importJobId],
    );
    return r.rows as Array<{ code: string; count: number }>;
  }
  private toJob(row: Record<string, unknown>): ImportJob {
    return {
      id: row.id as string,
      districtId: row.district_id as string,
      filename: row.filename as string,
      fileChecksum: (row.file_checksum as string | null) ?? null,
      status: row.status as ImportJob["status"],
      totalRows: row.total_rows as number,
      acceptedRows: row.accepted_rows as number,
      rejectedRows: row.rejected_rows as number,
      failureCode: (row.failure_code as string | null) ?? null,
      failureMessage: (row.failure_message as string | null) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
  private toError(row: Record<string, unknown>): ImportError {
    return {
      id: row.id as string,
      importJobId: row.import_job_id as string,
      rowNumber: row.row_number as number,
      field: row.field as string | null,
      code: row.code as string,
      message: row.message as string,
    };
  }

  private async updateWithClient(
    client: DatabaseClient,
    job: ImportJob,
  ): Promise<void> {
    await client.query(
      `UPDATE import_jobs
       SET status=$3, total_rows=$4, accepted_rows=$5, rejected_rows=$6,
           failure_code=$7, failure_message=$8, updated_at=$9
       WHERE district_id=$1 AND id=$2`,
      [
        job.districtId,
        job.id,
        job.status,
        job.totalRows,
        job.acceptedRows,
        job.rejectedRows,
        job.failureCode,
        job.failureMessage,
        job.updatedAt,
      ],
    );
  }

  private async withTransaction<T>(
    work: (client: DatabaseClient) => Promise<T>,
  ): Promise<T> {
    if ("release" in this.db) {
      const client = this.db as PoolClient;
      await client.query("SAVEPOINT import_pipeline");
      try {
        const result = await work(client);
        await client.query("RELEASE SAVEPOINT import_pipeline");
        return result;
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT import_pipeline");
        throw error;
      }
    }

    const client = await (this.db as Pool).connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
export class InMemoryImportRepository implements ImportRepository {
  private readonly jobs = new Map<string, ImportJob>();
  private readonly errors: ImportError[] = [];

  constructor(private readonly students?: StudentRepository) {}

  async createOrReuse(job: ImportJob): Promise<{ job: ImportJob; created: boolean }> {
    const existing = [...this.jobs.values()].find(
      (candidate) =>
        candidate.districtId === job.districtId &&
        candidate.fileChecksum === job.fileChecksum &&
        candidate.status !== "failed",
    );
    if (existing) return { job: existing, created: false };
    this.jobs.set(job.id, job);
    return { job, created: true };
  }
  async update(job: ImportJob): Promise<ImportJob> {
    this.jobs.set(job.id, job);
    return job;
  }
  async complete(
    job: ImportJob,
    candidates: ImportStudentCandidate[],
    errors: ImportError[],
  ): Promise<ImportJob> {
    if (!this.students)
      throw new Error("An in-memory student repository is required for imports.");
    const finalErrors = [...errors];
    let acceptedRows = 0;
    for (const candidate of candidates) {
      const existing = await this.students.findByExternalId(
        job.districtId,
        candidate.student.externalId,
      );
      if (existing) {
        finalErrors.push(duplicateExistingError(job.id, candidate.rowNumber));
      } else {
        await this.students.create(candidate.student);
        acceptedRows += 1;
      }
    }
    this.errors.push(...finalErrors);
    const completed = {
      ...job,
      status: "completed" as const,
      acceptedRows,
      rejectedRows: rejectedRowCount(finalErrors),
      failureCode: null,
      failureMessage: null,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, completed);
    return completed;
  }
  async fail(job: ImportJob, errors: ImportError[]): Promise<ImportJob> {
    this.errors.push(...errors);
    this.jobs.set(job.id, job);
    return job;
  }
  async findById(districtId: string, id: string): Promise<ImportJob | undefined> {
    const job = this.jobs.get(id);
    return job?.districtId === districtId ? job : undefined;
  }
  async addErrors(errors: ImportError[]): Promise<void> {
    this.errors.push(...errors);
  }
  async listErrors(id: string): Promise<ImportError[]> {
    return this.errors
      .filter((error) => error.importJobId === id)
      .sort((a, b) => a.rowNumber - b.rowNumber);
  }
  async categoryCounts(id: string): Promise<Array<{ code: string; count: number }>> {
    const counts = new Map<string, number>();
    for (const error of this.errors.filter((entry) => entry.importJobId === id))
      counts.set(error.code, (counts.get(error.code) ?? 0) + 1);
    return [...counts]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }
}

function duplicateExistingError(importJobId: string, rowNumber: number): ImportError {
  return {
    id: randomUUID(),
    importJobId,
    rowNumber,
    field: "externalId",
    code: "DUPLICATE_EXISTING_STUDENT",
    message: "External ID already exists in this district.",
  };
}

export function rejectedRowCount(errors: ImportError[]): number {
  return new Set(errors.map((error) => error.rowNumber)).size;
}
