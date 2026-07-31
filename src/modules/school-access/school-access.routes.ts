import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { parseInput, routeParam } from "../../shared/http/validation.js";
import type { SchoolAccessService } from "./school-access.service.js";
import type { AuditService } from "../audit/audit.service.js";

const districtIdSchema = z.string().uuid("District ID must be a UUID.");
const clerkUserIdSchema = z.string().trim().min(1).max(255);
const assignmentSchema = z.object({
  schoolNames: z.array(z.string().trim().min(1).max(200)).max(100),
});

export function createSchoolAccessRoutes(
  service: SchoolAccessService,
  requireCoordinator: RequestHandler,
  audit: AuditService,
): Router {
  const router = Router({ mergeParams: true });
  router.use(requireCoordinator);
  router.put("/:clerkUserId/schools", async (request, response) => {
    const schoolNames = await service.replace(
      parseInput(districtIdSchema, routeParam(request.params, "districtId")),
      parseInput(clerkUserIdSchema, routeParam(request.params, "clerkUserId")),
      parseInput(assignmentSchema, request.body).schoolNames,
    );
    await audit.record({
      districtId: parseInput(
        districtIdSchema,
        routeParam(request.params, "districtId"),
      ),
      actorUserId: request.identity!.userId,
      action: "specialist.school_access_replaced",
      requestId: request.requestId,
      metadata: {
        specialistUserId: parseInput(
          clerkUserIdSchema,
          parseInput(clerkUserIdSchema, routeParam(request.params, "clerkUserId")),
        ),
        schoolCount: schoolNames.length,
      },
    });
    response.json({ data: { schoolNames } });
  });
  router.get("/:clerkUserId/schools", async (request, response) => {
    const schoolNames = await service.list(
      parseInput(districtIdSchema, routeParam(request.params, "districtId")),
      parseInput(clerkUserIdSchema, routeParam(request.params, "clerkUserId")),
    );
    response.json({ data: { schoolNames } });
  });
  return router;
}
