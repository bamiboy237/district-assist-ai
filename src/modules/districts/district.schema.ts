import { z } from "zod";

export const createDistrictSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  stateCode: z.string().length(2, "State code must be 2 characters"),
  
})

export const districtSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stateCode: z.string().length(2),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type createDistrictInput = z.infer<typeof createDistrictSchema>
export type District = z.infer<typeof districtSchema>

