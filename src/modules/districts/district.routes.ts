import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { parseInput } from "../../shared/http/validation.js";
import { createDistrictSchema } from "./district.schema.js";
import type { DistrictService } from "./district.service.js";
import type { AuditService } from "../audit/audit.service.js";
import { ForbiddenError } from "../../shared/errors/app-error.js";

const createDistrictRequestSchema = createDistrictSchema.partial({
  clerkOrganizationId: true,
});
const updateDistrictSchema = z
  .object({
    name: createDistrictSchema.shape.name.optional(),
    stateCode: createDistrictSchema.shape.stateCode.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "At least one field is required.");
const idSchema = z.string().uuid("District ID must be a UUID.");
const clerkOrganizationSchema = z.object({
  clerkOrganizationId: z.string().trim().min(1).max(255),
});

export function createCurrentDistrictRoutes(service: DistrictService): Router {
  const router = Router();

  router.get("/current", async (request, response) => {
    const organizationId = request.identity?.organizationId;
    if (!organizationId) throw new ForbiddenError();
    response.json({ data: await service.getDistrictForOrganization(organizationId) });
  });

  return router;
}

export function createDistrictRoutes(
  service: DistrictService,
  requireDistrictCreator: RequestHandler,
  requirePlatformAdmin: RequestHandler,
  requireCoordinator: RequestHandler,
  audit: AuditService,
): Router {
  const router = Router();

  router.post("/", requireDistrictCreator, async (request, response) => {
    const input = parseInput(createDistrictRequestSchema, request.body);
    const clerkOrganizationId =
      request.identity?.organizationRole === "platform_admin"
        ? (input.clerkOrganizationId ?? request.identity.organizationId)
        : request.identity?.organizationId;
    const district = await service.createDistrict({
      name: input.name,
      stateCode: input.stateCode,
      clerkOrganizationId: clerkOrganizationId ?? "",
    });
    await audit.record({
      districtId: district.id,
      actorUserId: request.identity!.userId,
      action: "district.created",
      requestId: request.requestId,
    });
    response.status(201).json({ data: district });
  });

  router.get("/:districtId", async (request, response) => {
    const district = await service.getDistrict(
      parseInput(idSchema, request.params.districtId),
    );
    response.json({ data: district });
  });

  router.patch("/:districtId", requireCoordinator, async (request, response) => {
    const district = await service.updateDistrict(
      parseInput(idSchema, request.params.districtId),
      parseInput(updateDistrictSchema, request.body),
    );
    await audit.record({
      districtId: district.id,
      actorUserId: request.identity!.userId,
      action: "district.updated",
      requestId: request.requestId,
    });
    response.json({ data: district });
  });

  router.put(
    "/:districtId/clerk-organization",
    requirePlatformAdmin,
    async (request, response) => {
      await service.bindClerkOrganization(
        parseInput(idSchema, request.params.districtId),
        parseInput(clerkOrganizationSchema, request.body).clerkOrganizationId,
      );
      await audit.record({
        districtId: parseInput(idSchema, request.params.districtId),
        actorUserId: request.identity!.userId,
        action: "district.clerk_organization_bound",
        requestId: request.requestId,
      });
      response.status(204).send();
    },
  );

  return router;
}
