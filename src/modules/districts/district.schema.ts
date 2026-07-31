import { z } from "zod";

export const createDistrictSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  stateCode: z.string().trim().length(2, "State code must be 2 characters"),
  clerkOrganizationId: z.string().trim().min(1).max(255),
});

export const districtSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stateCode: z.string().length(2),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateDistrictInput = {
  name: string;
  stateCode: string;
  clerkOrganizationId: string;
};
export type District = z.infer<typeof districtSchema>;
