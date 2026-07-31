import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { parseInput, routeParam } from "../../shared/http/validation.js";
import {
  createSupportPlanSchema,
  updateSupportPlanSchema,
} from "./support-plan.schema.js";
import type { SupportPlanService } from "./support-plan.service.js";
import type { AuditService } from "../audit/audit.service.js";

const idSchema = z.string().uuid("ID must be a UUID.");

export function createSupportPlanRoutes(
  service: SupportPlanService,
  requirePlanEditor: RequestHandler,
  audit: AuditService,
): Router {
  const router = Router({ mergeParams: true });
  router.post("/", requirePlanEditor, async (req, res) => {
    const plan = await service.create(
      parseInput(idSchema, routeParam(req.params, "districtId")),
      parseInput(idSchema, routeParam(req.params, "studentId")),
      parseInput(createSupportPlanSchema, req.body),
    );
    await audit.record({
      districtId: plan.districtId,
      actorUserId: req.identity!.userId,
      action: "support_plan.created",
      requestId: req.requestId,
      metadata: {
        planId: plan.id,
        studentId: plan.studentId,
        status: plan.status,
      },
    });
    res.status(201).json({ data: plan });
  });
  router.get("/", async (req, res) => {
    const plans = await service.list(
      parseInput(idSchema, routeParam(req.params, "districtId")),
      parseInput(idSchema, routeParam(req.params, "studentId")),
    );
    res.json({ data: plans });
  });
  return router;
}

export function createSupportPlanUpdateRoutes(
  service: SupportPlanService,
  requirePlanEditor: RequestHandler,
  audit: AuditService,
): Router {
  const router = Router({ mergeParams: true });
  router.patch("/:planId", requirePlanEditor, async (req, res) => {
    const plan = await service.update(
      parseInput(idSchema, routeParam(req.params, "districtId")),
      parseInput(idSchema, routeParam(req.params, "planId")),
      parseInput(updateSupportPlanSchema, req.body),
    );
    await audit.record({
      districtId: plan.districtId,
      actorUserId: req.identity!.userId,
      action: "support_plan.updated",
      requestId: req.requestId,
      metadata: {
        planId: plan.id,
        studentId: plan.studentId,
        status: plan.status,
        version: plan.version,
      },
    });
    res.json({ data: plan });
  });
  return router;
}
