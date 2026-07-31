import { randomUUID } from "node:crypto";
import { logger } from "../../config/logger.js";

export const NO_MODEL_RAN_ID = "deterministic-service-v1";

export const DISTRICT_ASSISTANT_ID = "district-data-assistant";
export const DISTRICT_ASSISTANT_PROMPT_VERSION = "2026-07-30.1";
export const IMPORT_EXPLANATION_WORKFLOW_ID = "explain-import-errors";
export const IMPORT_EXPLANATION_WORKFLOW_VERSION = "2026-07-30.1";

export type AiTraceStatus = "success" | "safe_refusal" | "safe_failure" | "failure";

export type AiTraceStep = {
  id: string;
  durationMs: number;
  status: "success" | "failure";
};

export type AiTrace = {
  traceId: string;
  operationId: string;
  operationType: "agent" | "workflow";
  version: string;
  modelId: string;
  startedAt: string;
  durationMs: number;
  status: AiTraceStatus;
  inputShape: {
    messageLength: number | null;
    hasImportId: boolean;
  };
  steps: AiTraceStep[];
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
  errorCode: string | null;
};

export interface AiTraceRecorder {
  record(trace: AiTrace): void | Promise<void>;
}

class LogAiTraceRecorder implements AiTraceRecorder {
  record(trace: AiTrace): void {
    logger.info({ aiTrace: trace }, "AI operation completed");
  }
}

export const defaultAiTraceRecorder: AiTraceRecorder = new LogAiTraceRecorder();

export function createTraceId(): string {
  return randomUUID();
}

export async function recordTraceSafely(
  recorder: AiTraceRecorder,
  trace: AiTrace,
): Promise<void> {
  try {
    await recorder.record(trace);
  } catch (error) {
    logger.warn(
      {
        traceId: trace.traceId,
        recorderError:
          error instanceof Error ? error.constructor.name : "UnknownRecorderError",
      },
      "AI trace could not be recorded",
    );
  }
}
