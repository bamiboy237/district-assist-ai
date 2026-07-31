import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { parseInput, routeParam } from "../../shared/http/validation.js";
import { createStudentSchema, updateStudentSchema } from "./student.schema.js";
import type { StudentService } from "./student.service.js";
import type { SchoolAccessService } from "../school-access/school-access.service.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.js";

const idSchema = z.string().uuid("ID must be a UUID.");
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  gradeLevel: z.coerce.number().int().min(0).max(12).optional(),
});

export function createStudentRoutes(
  service: StudentService,
  requireCoordinator: RequestHandler,
  schoolAccess: SchoolAccessService,
): Router {
  const router = Router({ mergeParams: true });
  router.post("/", requireCoordinator, async (request, response) => {
    const student = await service.create(
      parseInput(idSchema, routeParam(request.params, "districtId")),
      parseInput(createStudentSchema, request.body),
    );
    response.status(201).json({ data: student });
  });
  router.get("/", async (request, response) => {
    const districtId = parseInput(idSchema, routeParam(request.params, "districtId"));
    const query = parseInput(listSchema, request.query);
    const schoolNames = await assignedSchools(request, districtId, schoolAccess);
    const result = await service.list(districtId, {
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.gradeLevel !== undefined ? { gradeLevel: query.gradeLevel } : {}),
      ...(schoolNames ? { schoolNames } : {}),
    });
    response.json({
      data: result.data,
      page: {
        limit: query.limit,
        cursor: query.cursor ?? null,
        nextCursor: result.nextCursor,
      },
    });
  });
  router.get("/:studentId", async (request, response) => {
    const districtId = parseInput(idSchema, routeParam(request.params, "districtId"));
    const student = await service.get(
      districtId,
      parseInput(idSchema, routeParam(request.params, "studentId")),
    );
    const schoolNames = await assignedSchools(request, districtId, schoolAccess);
    if (schoolNames && !schoolNames.includes(student.schoolName))
      throw new NotFoundError("Student");
    response.json({ data: student });
  });
  router.patch("/:studentId", requireCoordinator, async (request, response) => {
    const student = await service.update(
      parseInput(idSchema, routeParam(request.params, "districtId")),
      parseInput(idSchema, routeParam(request.params, "studentId")),
      parseInput(updateStudentSchema, request.body),
    );
    response.json({ data: student });
  });
  return router;
}

async function assignedSchools(
  request: Parameters<RequestHandler>[0],
  districtId: string,
  schoolAccess: SchoolAccessService,
): Promise<string[] | undefined> {
  if (
    request.identity?.organizationRole === "org:admin" ||
    request.identity?.organizationRole === "platform_admin"
  )
    return undefined;
  if (request.identity?.organizationRole !== "org:member" || !request.identity.userId)
    throw new ForbiddenError();
  return schoolAccess.list(districtId, request.identity.userId);
}
