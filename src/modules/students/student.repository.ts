import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";
import type { Student } from "./student.schema.js";

type DatabaseClient = Pool | PoolClient;

export type StudentListOptions = {
  limit: number;
  cursor?: string;
  search?: string;
  gradeLevel?: number;
  schoolNames?: string[];
};

export interface StudentRepository {
  create(student: Student): Promise<Student>;
  findById(districtId: string, id: string): Promise<Student | undefined>;
  findByExternalId(
    districtId: string,
    externalId: string,
  ): Promise<Student | undefined>;
  list(districtId: string, options: StudentListOptions): Promise<Student[]>;
  update(student: Student): Promise<Student>;
}

export class PgStudentRepository implements StudentRepository {
  constructor(private readonly db: DatabaseClient = pool) {}

  async create(student: Student): Promise<Student> {
    await this.db.query(
      `INSERT INTO students (id, district_id, external_id, first_name, last_name, grade_level, school_name, program_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
    return student;
  }

  async findById(districtId: string, id: string): Promise<Student | undefined> {
    const result = await this.db.query(
      "SELECT * FROM students WHERE district_id = $1 AND id = $2",
      [districtId, id],
    );
    return result.rows[0] ? this.toStudent(result.rows[0]) : undefined;
  }

  async findByExternalId(
    districtId: string,
    externalId: string,
  ): Promise<Student | undefined> {
    const result = await this.db.query(
      "SELECT * FROM students WHERE district_id = $1 AND external_id = $2",
      [districtId, externalId],
    );
    return result.rows[0] ? this.toStudent(result.rows[0]) : undefined;
  }

  async list(districtId: string, options: StudentListOptions): Promise<Student[]> {
    if (options.schoolNames?.length === 0) return [];
    const values: unknown[] = [districtId];
    const conditions = ["district_id = $1"];
    if (options.cursor) {
      values.push(options.cursor);
      conditions.push(`id > $${values.length}`);
    }
    if (options.gradeLevel !== undefined) {
      values.push(options.gradeLevel);
      conditions.push(`grade_level = $${values.length}`);
    }
    if (options.search) {
      values.push(`%${options.search}%`);
      conditions.push(
        `(first_name ILIKE $${values.length} OR last_name ILIKE $${values.length} OR external_id ILIKE $${values.length})`,
      );
    }
    if (options.schoolNames) {
      values.push(options.schoolNames);
      conditions.push(`school_name = ANY($${values.length}::text[])`);
    }
    values.push(options.limit + 1);
    const result = await this.db.query(
      `SELECT * FROM students WHERE ${conditions.join(" AND ")} ORDER BY id ASC LIMIT $${values.length}`,
      values,
    );
    return result.rows.map((row) => this.toStudent(row));
  }

  async update(student: Student): Promise<Student> {
    await this.db.query(
      `UPDATE students SET first_name = $3, last_name = $4, grade_level = $5, school_name = $6, program_status = $7, updated_at = $8
       WHERE district_id = $1 AND id = $2`,
      [
        student.districtId,
        student.id,
        student.firstName,
        student.lastName,
        student.gradeLevel,
        student.schoolName,
        student.programStatus,
        student.updatedAt,
      ],
    );
    return student;
  }

  private toStudent(row: Record<string, unknown>): Student {
    return {
      id: row.id as string,
      districtId: row.district_id as string,
      externalId: row.external_id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      gradeLevel: row.grade_level as number,
      schoolName: row.school_name as string,
      programStatus: row.program_status as Student["programStatus"],
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}

export class InMemoryStudentRepository implements StudentRepository {
  private readonly students = new Map<string, Student>();
  async create(student: Student): Promise<Student> {
    this.students.set(student.id, student);
    return student;
  }
  async findById(districtId: string, id: string): Promise<Student | undefined> {
    const student = this.students.get(id);
    return student?.districtId === districtId ? student : undefined;
  }
  async findByExternalId(
    districtId: string,
    externalId: string,
  ): Promise<Student | undefined> {
    return [...this.students.values()].find(
      (student) =>
        student.districtId === districtId && student.externalId === externalId,
    );
  }
  async list(districtId: string, options: StudentListOptions): Promise<Student[]> {
    return [...this.students.values()]
      .filter(
        (student) =>
          student.districtId === districtId &&
          (!options.cursor || student.id > options.cursor) &&
          (options.gradeLevel === undefined ||
            student.gradeLevel === options.gradeLevel) &&
          (!options.schoolNames || options.schoolNames.includes(student.schoolName)) &&
          (!options.search ||
            `${student.firstName} ${student.lastName} ${student.externalId}`
              .toLowerCase()
              .includes(options.search.toLowerCase())),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, options.limit + 1);
  }
  async update(student: Student): Promise<Student> {
    this.students.set(student.id, student);
    return student;
  }
}
