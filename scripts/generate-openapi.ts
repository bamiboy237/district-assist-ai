import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const { createDistrictSchema } =
  await import("../src/modules/districts/district.schema.js");
const { createStudentSchema, studentSchema } =
  await import("../src/modules/students/student.schema.js");
const { importJobSchema, importErrorSchema } =
  await import("../src/modules/imports/import.schema.js");
const { createSupportPlanSchema, supportPlanSchema } =
  await import("../src/modules/support-plans/support-plan.schema.js");

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const registry = new OpenAPIRegistry();

registry.register("District", createDistrictSchema);
registry.register("Student", studentSchema);
registry.register("CreateStudent", createStudentSchema);
registry.register("ImportJob", importJobSchema);
registry.register("ImportError", importErrorSchema);
registry.register("SupportPlan", supportPlanSchema);
registry.register("CreateSupportPlan", createSupportPlanSchema);

const idParam = z.string().uuid();

registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Health check",
  tags: ["System"],
  responses: { 200: { description: "OK" } },
});
registry.registerPath({
  method: "get",
  path: "/ready",
  summary: "Readiness check",
  tags: ["System"],
  responses: { 200: { description: "OK" }, 503: { description: "Degraded" } },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/districts",
  summary: "Create a district",
  tags: ["Districts"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDistrictSchema.partial({ clerkOrganizationId: true }),
        },
      },
    },
  },
  responses: { 201: { description: "Created" } },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/districts/current",
  summary: "Resolve current district",
  tags: ["Districts"],
  responses: { 200: { description: "OK" } },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/districts/{districtId}/students",
  summary: "Create a student",
  tags: ["Students"],
  request: {
    params: z.object({ districtId: idParam }),
    body: { content: { "application/json": { schema: createStudentSchema } } },
  },
  responses: { 201: { description: "Created" } },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/districts/{districtId}/students",
  summary: "List students",
  tags: ["Students"],
  responses: { 200: { description: "OK" } },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/districts/{districtId}/imports/students",
  summary: "Upload student CSV",
  tags: ["Imports"],
  responses: { 201: { description: "Created" } },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/districts/{districtId}/imports/{importId}",
  summary: "Get import status",
  tags: ["Imports"],
  responses: { 200: { description: "OK" } },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/districts/{districtId}/imports/{importId}/errors",
  summary: "List import errors",
  tags: ["Imports"],
  responses: { 200: { description: "OK" } },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/districts/{districtId}/students/{studentId}/support-plans",
  summary: "Create a support plan",
  tags: ["Support Plans"],
  request: {
    params: z.object({ districtId: idParam, studentId: idParam }),
    body: { content: { "application/json": { schema: createSupportPlanSchema } } },
  },
  responses: { 201: { description: "Created" } },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/districts/{districtId}/students/{studentId}/support-plans",
  summary: "List support plans",
  tags: ["Support Plans"],
  responses: { 200: { description: "OK" } },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/districts/{districtId}/assistant/messages",
  summary: "AI assistant message",
  tags: ["AI"],
  responses: { 200: { description: "OK" } },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const spec = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "DistrictAssist AI",
    version: "1.0.0",
    description: "API for managing student data, imports, and support plans.",
  },
  servers: [{ url: "http://localhost:3000" }],
});

const output = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "openapi.json",
);
await fs.writeFile(output, JSON.stringify(spec, null, 2), "utf-8");
console.log(`OpenAPI spec written to ${output}`);
