import { z } from "zod";

export const errorCategorySchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/),
  count: z.number().int().positive(),
});

export const importSummarySchema = z.object({
  status: z.enum(["received", "processing", "completed", "failed"]),
  totalRows: z.number().int().nonnegative(),
  acceptedRows: z.number().int().nonnegative(),
  rejectedRows: z.number().int().nonnegative(),
  categories: z.array(errorCategorySchema).max(20),
});

export type ImportSummary = z.infer<typeof importSummarySchema>;
