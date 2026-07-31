import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Request as ExpressRequest,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { pool } from "./database/pool.js";
import { logger } from "./config/logger.js";
import { env } from "./config/env.js";
import {
  createCurrentDistrictRoutes,
  createDistrictRoutes,
} from "./modules/districts/district.routes.js";
import { PgDistrictRepository } from "./modules/districts/district.repository.js";
import { DistrictService } from "./modules/districts/district.service.js";
import { createImportRoutes } from "./modules/imports/import.routes.js";
import { PgImportRepository } from "./modules/imports/import.repository.js";
import { ImportService } from "./modules/imports/import.service.js";
import { createStudentRoutes } from "./modules/students/student.routes.js";
import { PgStudentRepository } from "./modules/students/student.repository.js";
import { StudentService } from "./modules/students/student.service.js";
import {
  createSupportPlanRoutes,
  createSupportPlanUpdateRoutes,
} from "./modules/support-plans/support-plan.routes.js";
import { PgSupportPlanRepository } from "./modules/support-plans/support-plan.repository.js";
import { SupportPlanService } from "./modules/support-plans/support-plan.service.js";
import { DistrictMastra } from "./mastra/mastra.js";
import { AppError } from "./shared/errors/app-error.js";
import { routeParam } from "./shared/http/validation.js";
import { clerkMiddleware } from "@clerk/express";
import {
  clerkIdentityFromRequest,
  requireAuthentication,
  requireDistrictAccess,
  requireDistrictCreator,
  requirePlatformAdmin,
  requireCoordinator,
  requirePlanEditor,
  type IdentityResolver,
} from "./auth/clerk.js";
import { PlatformAdminService } from "./modules/platform-admins/platform-admin.service.js";
import { PgPlatformAdminRepository } from "./modules/platform-admins/platform-admin.repository.js";
import { SchoolAccessService } from "./modules/school-access/school-access.service.js";
import { PgSchoolAccessRepository } from "./modules/school-access/school-access.repository.js";
import { createSchoolAccessRoutes } from "./modules/school-access/school-access.routes.js";
import {
  requirePlanSchoolAccess,
  requireStudentSchoolAccess,
} from "./modules/school-access/school-access.middleware.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { PgAuditRepository } from "./modules/audit/audit.repository.js";

export type AppServices = {
  districts: DistrictService;
  students: StudentService;
  imports: ImportService;
  supportPlans: SupportPlanService;
  platformAdmins: PlatformAdminService;
  schoolAccess: SchoolAccessService;
  audit: AuditService;
  mastra: DistrictMastra;
};

function createProductionServices(): AppServices {
  const districts = new DistrictService(new PgDistrictRepository());
  const students = new StudentService(new PgStudentRepository());
  const imports = new ImportService(new PgImportRepository());
  return {
    districts,
    students,
    imports,
    supportPlans: new SupportPlanService(new PgSupportPlanRepository(), students),
    platformAdmins: new PlatformAdminService(new PgPlatformAdminRepository()),
    schoolAccess: new SchoolAccessService(new PgSchoolAccessRepository()),
    audit: new AuditService(new PgAuditRepository()),
    mastra: new DistrictMastra(imports),
  };
}

export function createApp(
  options: { services?: AppServices; resolveIdentity?: IdentityResolver } = {},
) {
  const services = options.services ?? createProductionServices();
  const resolveIdentity = options.resolveIdentity ?? clerkIdentityFromRequest;
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use((request, response, next) => {
    request.requestId = randomUUID();
    response.setHeader("X-Request-Id", request.requestId);
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => request.requestId,
      customLogLevel: (_request, response, error) =>
        error || response.statusCode >= 500
          ? "error"
          : response.statusCode >= 400
            ? "warn"
            : "info",
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: request.url,
        }),
        res: (response) => ({ statusCode: response.statusCode }),
      },
      customSuccessObject: (request, _response, value) => ({
        ...value,
        routeTemplate: routeTemplate(request as unknown as ExpressRequest),
      }),
      customErrorObject: (request, _response, _error, value) => ({
        ...value,
        routeTemplate: routeTemplate(request as unknown as ExpressRequest),
      }),
    }),
  );

  app.get("/health", (request, response) =>
    response.json({
      status: "ok",
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    }),
  );
  app.get("/ready", async (_request, response) => {
    try {
      await pool.query("SELECT 1");
      response.json({ status: "ok" });
    } catch {
      response.status(503).json({ status: "degraded" });
    }
  });
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_request, _response, next) =>
        next(new AppError(429, "RATE_LIMITED", "Too many requests.")),
    }),
  );

  const authenticate = requireAuthentication(resolveIdentity);
  const platformAdminOnly = requirePlatformAdmin(services.platformAdmins);
  const districtCreator = requireDistrictCreator(services.platformAdmins);
  const districtAccess = requireDistrictAccess(
    services.districts,
    services.platformAdmins,
  );
  const coordinatorOnly = requireCoordinator();
  const planEditor = requirePlanEditor();
  const studentSchoolAccess = requireStudentSchoolAccess(
    services.students,
    services.schoolAccess,
  );
  const planSchoolAccess = requirePlanSchoolAccess(
    services.supportPlans,
    services.students,
    services.schoolAccess,
  );

  if (!options.resolveIdentity) app.use("/api/v1", clerkMiddleware());
  app.use("/api/v1", authenticate);
  app.use("/api/v1/districts", createCurrentDistrictRoutes(services.districts));
  app.use("/api/v1/districts/:districtId", districtAccess);
  app.use(
    "/api/v1/districts",
    createDistrictRoutes(
      services.districts,
      districtCreator,
      platformAdminOnly,
      coordinatorOnly,
      services.audit,
    ),
  );
  app.use(
    "/api/v1/districts/:districtId/students",
    createStudentRoutes(services.students, coordinatorOnly, services.schoolAccess),
  );
  app.use(
    "/api/v1/districts/:districtId/specialists",
    createSchoolAccessRoutes(services.schoolAccess, coordinatorOnly, services.audit),
  );
  app.use(
    "/api/v1/districts/:districtId/imports",
    createImportRoutes(services.imports, coordinatorOnly),
  );
  app.use(
    "/api/v1/districts/:districtId/students/:studentId/support-plans",
    studentSchoolAccess,
    createSupportPlanRoutes(services.supportPlans, planEditor, services.audit),
  );
  app.use("/api/v1/districts/:districtId/support-plans/:planId", planSchoolAccess);
  app.use(
    "/api/v1/districts/:districtId/support-plans",
    createSupportPlanUpdateRoutes(services.supportPlans, planEditor, services.audit),
  );
  app.post(
    "/api/v1/districts/:districtId/assistant/messages",
    coordinatorOnly,
    async (request, response) =>
      response.json({
        data: await services.mastra.assistant.answer(
          routeParam(request.params, "districtId"),
          request.body,
        ),
      }),
  );
  app.post(
    "/api/v1/districts/:districtId/imports/:importId/explain-errors",
    coordinatorOnly,
    async (request, response) =>
      response.json({
        data: await services.mastra.explainImportErrors(
          routeParam(request.params, "districtId"),
          routeParam(request.params, "importId"),
        ),
      }),
  );

  app.use((request, response) =>
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `No route matches ${request.method} ${request.originalUrl}.`,
        requestId: request.requestId,
      },
    }),
  );
  app.use(errorHandler);
  return app;
}

const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  void next;
  const appError = toAppError(error);
  if (appError.status >= 500)
    request.log.error(
      { err: error, requestId: request.requestId, code: appError.code },
      "Request failed",
    );
  response.status(appError.status).json({
    error: {
      code: appError.code,
      message:
        appError.status >= 500 && env.NODE_ENV === "production"
          ? "Unexpected error."
          : appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      requestId: request.requestId,
    },
  });
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  )
    return new AppError(400, "INVALID_JSON", "Request body contains invalid JSON.");
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "LIMIT_FILE_SIZE"
  )
    return new AppError(413, "PAYLOAD_TOO_LARGE", "CSV files must be 1 MB or smaller.");
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
    return new AppError(
      409,
      "CONFLICT",
      "This record conflicts with an existing record.",
    );
  return new AppError(500, "INTERNAL_ERROR", "Unexpected error.");
}

function routeTemplate(request: ExpressRequest): string | null {
  if (typeof request.route?.path !== "string") return null;
  let baseUrl = request.baseUrl;
  for (const [name, value] of Object.entries(request.params)) {
    if (typeof value === "string") baseUrl = baseUrl.replace(value, `:${name}`);
  }
  return `${baseUrl}${request.route.path}`;
}
