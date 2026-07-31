import { z } from "zod";

export const planStatuses = ["draft", "active", "completed", "cancelled"] as const;
export const createSupportPlanSchema = z
  .object({
    goal: z.string().trim().min(1).max(2000),
    startDate: z.string().date(),
    reviewDate: z.string().date(),
    status: z.enum(planStatuses).default("draft"),
  })
  .refine((value) => value.reviewDate >= value.startDate, {
    path: ["reviewDate"],
    message: "Review date must be on or after the start date.",
  });
export const updateSupportPlanSchema = z.object({
  goal: z.string().trim().min(1).max(2000).optional(),
  reviewDate: z.string().date().optional(),
  status: z.enum(planStatuses).optional(),
  version: z.number().int().nonnegative(),
});
export const supportPlanSchema = z.object({
  id: z.string().uuid(),
  districtId: z.string().uuid(),
  studentId: z.string().uuid(),
  goal: z.string(),
  startDate: z.string().date(),
  reviewDate: z.string().date(),
  status: z.enum(planStatuses),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SupportPlan = z.infer<typeof supportPlanSchema>;
export type CreateSupportPlanInput = {
  goal: string;
  startDate: string;
  reviewDate: string;
  status: (typeof planStatuses)[number];
};
export type UpdateSupportPlanInput = {
  goal?: string | undefined;
  reviewDate?: string | undefined;
  status?: (typeof planStatuses)[number] | undefined;
  version: number;
};
