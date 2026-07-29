import { Router } from "express";
import { createDistrictSchema } from "./district.schema.js";
import type { DistrictService } from "./district.service.js";

export function createDistrictRoutes(service: DistrictService): Router {
  const router = Router()

  router.post("/", async (req, res) => {
    const parsed = createDistrictSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          requestId: req.requestId,
        },
      });
    }
    const district = await service.createDistrict(parsed.data);
    res.status(201).json({ data: district });
  });
  return router;
}