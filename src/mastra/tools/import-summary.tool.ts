import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { ImportService } from "../../modules/imports/import.service.js";
import {
  importSummarySchema,
  type ImportSummary,
} from "../../shared/import-summary.js";

type ImportSummaryService = Pick<ImportService, "summary">;

export type { ImportSummary as ImportSummaryOutput, ImportSummary };
export { importSummarySchema as importSummaryOutputSchema };

export async function getImportSummary(
  imports: ImportSummaryService,
  districtId: string,
  importId: string,
): Promise<ImportSummary> {
  const summary = await imports.summary(districtId, importId);
  return importSummarySchema.parse({
    status: summary.import.status,
    totalRows: summary.import.totalRows,
    acceptedRows: summary.import.acceptedRows,
    rejectedRows: summary.import.rejectedRows,
    categories: summary.categories.slice(0, 20),
  });
}

export function createImportSummaryTool(imports: ImportService, districtId: string) {
  return createTool({
    id: "get-import-summary",
    description:
      "Return safe aggregate counts and error categories for one authorized import. It never returns student rows.",
    inputSchema: z.object({ importId: z.string().uuid() }),
    outputSchema: importSummarySchema,
    execute: async ({ importId }) => getImportSummary(imports, districtId, importId),
  });
}
