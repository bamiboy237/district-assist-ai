import { z } from "zod";

export const programStatuses = ["active", "monitoring", "inactive"] as const;

export const createStudentSchema = z.object({
  externalId: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  gradeLevel: z.number().int().min(0).max(12),
  schoolName: z.string().trim().min(1).max(200),
  programStatus: z.enum(programStatuses),
});

export const updateStudentSchema = createStudentSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required.");

export const studentSchema = createStudentSchema.extend({
  id: z.string().uuid(),
  districtId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateStudentInput = {
  externalId: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  schoolName: string;
  programStatus: (typeof programStatuses)[number];
};
export type UpdateStudentInput = {
  externalId?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  gradeLevel?: number | undefined;
  schoolName?: string | undefined;
  programStatus?: (typeof programStatuses)[number] | undefined;
};
export type Student = z.infer<typeof studentSchema>;
