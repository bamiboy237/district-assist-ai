import type { RequestHandler } from "express";
import type { StudentService } from "../students/student.service.js";
import type { SupportPlanService } from "../support-plans/support-plan.service.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.js";
import type { SchoolAccessService } from "./school-access.service.js";

export function requireStudentSchoolAccess(
  students: StudentService,
  schoolAccess: SchoolAccessService,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (hasDistrictWideAccess(request.identity?.organizationRole)) return next();
      const districtId = stringParam(request.params.districtId);
      const studentId = stringParam(request.params.studentId);
      const student = await students.get(districtId, studentId);
      await assertAssignedSchool(
        schoolAccess,
        districtId,
        request.identity?.userId,
        student.schoolName,
      );
      return next();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError)
        return next(new NotFoundError("Student"));
      return next(error);
    }
  };
}

export function requirePlanSchoolAccess(
  plans: SupportPlanService,
  students: StudentService,
  schoolAccess: SchoolAccessService,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (hasDistrictWideAccess(request.identity?.organizationRole)) return next();
      const districtId = stringParam(request.params.districtId);
      const plan = await plans.get(districtId, stringParam(request.params.planId));
      const student = await students.get(districtId, plan.studentId);
      await assertAssignedSchool(
        schoolAccess,
        districtId,
        request.identity?.userId,
        student.schoolName,
      );
      return next();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError)
        return next(new NotFoundError("Support plan"));
      return next(error);
    }
  };
}

function hasDistrictWideAccess(role: string | null | undefined): boolean {
  return role === "org:admin" || role === "platform_admin";
}

async function assertAssignedSchool(
  schoolAccess: SchoolAccessService,
  districtId: string,
  userId: string | undefined,
  schoolName: string,
): Promise<void> {
  if (!userId) throw new ForbiddenError();
  const schoolNames = await schoolAccess.list(districtId, userId);
  if (!schoolNames.includes(schoolName)) throw new ForbiddenError();
}

function stringParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
