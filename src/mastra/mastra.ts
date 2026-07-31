import { Mastra } from "@mastra/core/mastra";
import type { MastraCompositeStore } from "@mastra/core/storage";
import type { ImportService } from "../modules/imports/import.service.js";
import { DistrictDataAssistant } from "./agents/district-data-assistant.js";
import {
  createTraceId,
  defaultAiTraceRecorder,
  IMPORT_EXPLANATION_WORKFLOW_ID,
  IMPORT_EXPLANATION_WORKFLOW_VERSION,
  NO_MODEL_RAN_ID,
  recordTraceSafely,
  type AiTraceRecorder,
  type AiTraceStep,
} from "./observability/ai-trace.js";
import {
  createImportExplanationWorkflow,
  type ImportExplanation,
} from "./workflows/explain-import-errors.js";
import { createMastraStorage } from "./storage.js";

export class DistrictMastra {
  readonly assistant: DistrictDataAssistant;
  readonly mastra;

  constructor(
    imports: ImportService,
    private readonly traceRecorder: AiTraceRecorder = defaultAiTraceRecorder,
    storage: MastraCompositeStore = createMastraStorage(),
  ) {
    const explainImportErrors = createImportExplanationWorkflow(imports);
    this.mastra = new Mastra({
      workflows: { explainImportErrors },
      storage,
    });
    this.assistant = new DistrictDataAssistant(imports, traceRecorder);
  }

  async explainImportErrors(
    districtId: string,
    importId: string,
  ): Promise<ImportExplanation> {
    const traceId = createTraceId();
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const workflow = this.mastra.getWorkflow("explainImportErrors");
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { districtId, importId, traceId },
    });
    const steps: AiTraceStep[] = Object.entries(result.steps).flatMap(([id, value]) => {
      if (!value || typeof value !== "object") return [];
      const step = value as Record<string, unknown>;
      if (step.status !== "success" && step.status !== "failed") return [];
      const status = step.status === "success" ? "success" : "failure";
      const startedAtVal = typeof step.startedAt === "number" ? step.startedAt : null;
      const endedAt = typeof step.endedAt === "number" ? step.endedAt : null;
      return [
        {
          id,
          status,
          durationMs:
            startedAtVal !== null && endedAt !== null
              ? Math.round((endedAt - startedAtVal) * 100) / 100
              : 0,
        },
      ];
    });

    await recordTraceSafely(this.traceRecorder, {
      traceId,
      operationId: IMPORT_EXPLANATION_WORKFLOW_ID,
      operationType: "workflow",
      version: IMPORT_EXPLANATION_WORKFLOW_VERSION,
      modelId: NO_MODEL_RAN_ID,
      startedAt,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      status: result.status === "success" ? "success" : "failure",
      inputShape: {
        messageLength: null,
        hasImportId: true,
      },
      steps,
      usage: {
        inputTokens: null,
        outputTokens: null,
      },
      errorCode: null,
    });

    if (result.status === "success") return result.result;
    if (result.status === "failed") throw result.error;
    throw new Error(`Import explanation workflow ended with ${result.status}.`);
  }
}

export type {
  AiTrace,
  AiTraceRecorder,
  AiTraceStatus,
} from "./observability/ai-trace.js";
