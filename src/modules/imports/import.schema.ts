import { z } from "zod";
import { createStudentSchema } from "../students/student.schema.js";

export const importStatuses = [
  "received",
  "processing",
  "completed",
  "failed",
] as const;
export const importJobSchema = z.object({
  id: z.string().uuid(),
  districtId: z.string().uuid(),
  filename: z.string(),
  fileChecksum: z.string().nullable(),
  status: z.enum(importStatuses),
  totalRows: z.number().int().nonnegative(),
  acceptedRows: z.number().int().nonnegative(),
  rejectedRows: z.number().int().nonnegative(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const importErrorSchema = z.object({
  id: z.string().uuid(),
  importJobId: z.string().uuid(),
  rowNumber: z.number().int().positive(),
  field: z.string().nullable(),
  code: z.string(),
  message: z.string(),
});

export const importStudentRowSchema = createStudentSchema.extend({
  gradeLevel: z.coerce.number().int("Grade level must be an integer.").min(0).max(12),
});
export type ImportJob = z.infer<typeof importJobSchema>;
export type ImportError = z.infer<typeof importErrorSchema>;
