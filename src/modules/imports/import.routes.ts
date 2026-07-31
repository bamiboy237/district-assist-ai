import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";
import { parseInput, routeParam } from "../../shared/http/validation.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { ImportService } from "./import.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) =>
    callback(
      null,
      file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv"),
    ),
});
const idSchema = z.string().uuid("ID must be a UUID.");

export function createImportRoutes(
  service: ImportService,
  requireCoordinator: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.post(
    "/students",
    requireCoordinator,
    upload.single("file"),
    async (request, response) => {
      const districtId = parseInput(idSchema, routeParam(request.params, "districtId"));
      if (!request.file)
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Attach one CSV file in the 'file' field.",
        );
      const result = await service.processCsv(
        districtId,
        request.file.originalname,
        request.file.buffer,
      );
      request.log.info(
        { importJobId: result.job.id, reused: result.reused },
        "Student import request completed",
      );
      if (result.reused) response.setHeader("Idempotent-Replayed", "true");
      response.status(result.reused ? 200 : 201).json({ data: result.job });
    },
  );
  router.get("/:importId", async (request, response) => {
    const job = await service.get(
      parseInput(idSchema, routeParam(request.params, "districtId")),
      parseInput(idSchema, routeParam(request.params, "importId")),
    );
    response.json({ data: job });
  });
  router.get("/:importId/errors", async (request, response) => {
    const errors = await service.errors(
      parseInput(idSchema, routeParam(request.params, "districtId")),
      parseInput(idSchema, routeParam(request.params, "importId")),
    );
    response.json({ data: errors });
  });
  return router;
}
