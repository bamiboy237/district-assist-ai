import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from "./student.schema.js";
import type { StudentListOptions, StudentRepository } from "./student.repository.js";

export class StudentService {
  constructor(private readonly repository: StudentRepository) {}

  async create(districtId: string, input: CreateStudentInput): Promise<Student> {
    if (await this.repository.findByExternalId(districtId, input.externalId))
      throw new ConflictError(
        "A student with this external ID already exists in this district.",
      );
    const now = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(),
      districtId,
      externalId: input.externalId,
      firstName: input.firstName,
      lastName: input.lastName,
      gradeLevel: input.gradeLevel,
      schoolName: input.schoolName,
      programStatus: input.programStatus,
      createdAt: now,
      updatedAt: now,
    });
  }
  async get(districtId: string, id: string): Promise<Student> {
    const student = await this.repository.findById(districtId, id);
    if (!student) throw new NotFoundError("Student");
    return student;
  }
  async list(
    districtId: string,
    options: StudentListOptions,
  ): Promise<{ data: Student[]; nextCursor: string | null }> {
    const results = await this.repository.list(districtId, options);
    const hasNext = results.length > options.limit;
    const data = hasNext ? results.slice(0, -1) : results;
    return { data, nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null };
  }
  async update(
    districtId: string,
    id: string,
    input: UpdateStudentInput,
  ): Promise<Student> {
    const student = await this.get(districtId, id);
    return this.repository.update({
      id: student.id,
      districtId: student.districtId,
      externalId: input.externalId ?? student.externalId,
      firstName: input.firstName ?? student.firstName,
      lastName: input.lastName ?? student.lastName,
      gradeLevel: input.gradeLevel ?? student.gradeLevel,
      schoolName: input.schoolName ?? student.schoolName,
      programStatus: input.programStatus ?? student.programStatus,
      createdAt: student.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
}
