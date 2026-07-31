import type { ImportError, ImportJob } from "../../modules/imports/import.schema.js";
import { evaluationIds } from "./district-assistant.cases.js";
import type { AiTrace, AiTraceRecorder } from "../observability/ai-trace.js";

export class CapturingTraceRecorder implements AiTraceRecorder {
  readonly traces: AiTrace[] = [];

  record(trace: AiTrace): void {
    this.traces.push(trace);
  }
}

export function completedJob(): ImportJob {
  return {
    id: evaluationIds.completedImport,
    districtId: evaluationIds.district,
    filename: "synthetic-students.csv",
    fileChecksum: null,
    status: "completed",
    totalRows: 20,
    acceptedRows: 18,
    rejectedRows: 2,
    failureCode: null,
    failureMessage: null,
    createdAt: "2026-07-30T12:00:00.000Z",
    updatedAt: "2026-07-30T12:00:00.000Z",
  };
}

export function syntheticErrors(): ImportError[] {
  return [
    ["00000000-0000-4000-8000-000000000202", 2],
    ["00000000-0000-4000-8000-000000000203", 3],
  ].map(([id, rowNumber]) => ({
    id: String(id),
    importJobId: evaluationIds.completedImport,
    rowNumber: Number(rowNumber),
    field: "gradeLevel",
    code: "INVALID_FIELD",
    message: "Synthetic validation error.",
  }));
}

export function job(
  id: string,
  districtId: string,
  counts: Pick<ImportJob, "status" | "totalRows" | "acceptedRows" | "rejectedRows">,
): ImportJob {
  return {
    id,
    districtId,
    filename: "synthetic-students.csv",
    fileChecksum: null,
    ...counts,
    failureCode: counts.status === "failed" ? "INTERNAL_ERROR" : null,
    failureMessage:
      counts.status === "failed" ? "The import could not be completed." : null,
    createdAt: "2026-07-30T12:00:00.000Z",
    updatedAt: "2026-07-30T12:00:00.000Z",
  };
}
