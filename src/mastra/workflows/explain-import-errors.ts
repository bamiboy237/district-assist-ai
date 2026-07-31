import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import type { ImportService } from "../../modules/imports/import.service.js";
import { errorCategorySchema } from "../../shared/import-summary.js";
import { formatWorkflowSummary } from "../../shared/import-renderer.js";
import { IMPORT_EXPLANATION_WORKFLOW_ID } from "../observability/ai-trace.js";

export const importExplanationSchema = z.object({
  traceId: z.string().uuid(),
  summary: z.string(),
  topIssues: z.array(
    z.object({
      code: z.string(),
      count: z.number().int().nonnegative(),
      explanation: z.string(),
      suggestedFix: z.string(),
    }),
  ),
  caveat: z.string(),
});
export type ImportExplanation = z.infer<typeof importExplanationSchema>;

const workflowInputSchema = z.object({
  districtId: z.string().uuid(),
  importId: z.string().uuid(),
  traceId: z.string().uuid(),
});

const loadImportOutputSchema = z.object({
  traceId: z.string().uuid(),
  status: z.enum(["received", "processing", "completed", "failed"]),
  acceptedRows: z.number().int().nonnegative(),
  rejectedRows: z.number().int().nonnegative(),
  categories: z.array(errorCategorySchema).max(20),
});

const fixes: Record<string, { explanation: string; suggestedFix: string }> = {
  INVALID_FIELD: {
    explanation: "A required value was missing or did not match the expected format.",
    suggestedFix:
      "Check required columns, grade levels, and program statuses before uploading.",
  },
  DUPLICATE_IN_FILE: {
    explanation: "The same external ID appeared more than once in the uploaded file.",
    suggestedFix: "Keep one row per external ID, then upload again.",
  },
  DUPLICATE_EXISTING_STUDENT: {
    explanation: "The external ID already exists in this district.",
    suggestedFix:
      "Update the existing student through the normal record workflow instead of importing a duplicate.",
  },
};

export function createImportExplanationWorkflow(imports: ImportService) {
  const loadImportSummary = createStep({
    id: "load-import-summary",
    inputSchema: workflowInputSchema,
    outputSchema: loadImportOutputSchema,
    execute: async ({ inputData }) => {
      const summary = await imports.summary(inputData.districtId, inputData.importId);
      return {
        traceId: inputData.traceId,
        status: summary.import.status,
        acceptedRows: summary.import.acceptedRows,
        rejectedRows: summary.import.rejectedRows,
        categories: summary.categories.slice(0, 20),
      };
    },
  });

  const buildImportExplanation = createStep({
    id: "build-import-explanation",
    inputSchema: loadImportOutputSchema,
    outputSchema: importExplanationSchema,
    execute: async ({ inputData }) => ({
      traceId: inputData.traceId,
      summary: formatWorkflowSummary(
        inputData.status,
        inputData.acceptedRows,
        inputData.rejectedRows,
      ),
      topIssues: inputData.categories.map((category) => ({
        code: category.code,
        count: category.count,
        ...(fixes[category.code] ?? {
          explanation: "This row did not meet the import rules.",
          suggestedFix: "Review the error report and correct the affected rows.",
        }),
      })),
      caveat:
        "This explanation is based on aggregate validation categories and does not make decisions about students.",
    }),
  });

  return createWorkflow({
    id: IMPORT_EXPLANATION_WORKFLOW_ID,
    inputSchema: workflowInputSchema,
    outputSchema: importExplanationSchema,
  })
    .then(loadImportSummary)
    .then(buildImportExplanation)
    .commit();
}
