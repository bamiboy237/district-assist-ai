import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ImportService } from "../../modules/imports/import.service.js";
import { InMemoryImportRepository } from "../../modules/imports/import.repository.js";
import type { ImportError } from "../../modules/imports/import.schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import { DistrictDataAssistant } from "../agents/district-data-assistant.js";
import { DistrictMastra } from "../mastra.js";
import {
  DISTRICT_ASSISTANT_PROMPT_VERSION,
  NO_MODEL_RAN_ID,
  type AiTraceRecorder,
} from "../observability/ai-trace.js";
import {
  districtAssistantEvaluationCases,
  evaluationIds,
  LOCAL_DETERMINISTIC_LATENCY_BUDGET_MS,
} from "./district-assistant.cases.js";
import { CapturingTraceRecorder, job } from "./test-fixtures.js";

describe("District Data Assistant deterministic evaluations", () => {
  const repository = new InMemoryImportRepository();
  const imports = new ImportService(repository);
  const recorder = new CapturingTraceRecorder();
  const assistant = new DistrictDataAssistant(imports, recorder);

  beforeAll(async () => {
    await repository.update(
      job(evaluationIds.completedImport, evaluationIds.district, {
        status: "completed",
        totalRows: 20,
        acceptedRows: 18,
        rejectedRows: 2,
      }),
    );
    await repository.update(
      job(evaluationIds.cleanImport, evaluationIds.district, {
        status: "completed",
        totalRows: 10,
        acceptedRows: 10,
        rejectedRows: 0,
      }),
    );
    await repository.update(
      job(evaluationIds.processingImport, evaluationIds.district, {
        status: "processing",
        totalRows: 8,
        acceptedRows: 6,
        rejectedRows: 1,
      }),
    );
    await repository.update(
      job(evaluationIds.failedImport, evaluationIds.district, {
        status: "failed",
        totalRows: 5,
        acceptedRows: 3,
        rejectedRows: 2,
      }),
    );
    await repository.update(
      job(evaluationIds.otherDistrictImport, evaluationIds.otherDistrict, {
        status: "completed",
        totalRows: 999,
        acceptedRows: 999,
        rejectedRows: 0,
      }),
    );
    const errors: ImportError[] = [
      {
        id: "00000000-0000-4000-8000-000000000201",
        importJobId: evaluationIds.completedImport,
        rowNumber: 2,
        field: "gradeLevel",
        code: "INVALID_FIELD",
        message: "Synthetic validation error.",
      },
      {
        id: "00000000-0000-4000-8000-000000000202",
        importJobId: evaluationIds.completedImport,
        rowNumber: 3,
        field: "gradeLevel",
        code: "INVALID_FIELD",
        message: "Synthetic validation error.",
      },
    ];
    await repository.addErrors(errors);
  });

  beforeEach(() => {
    recorder.traces.length = 0;
  });

  it.each(districtAssistantEvaluationCases)(
    "$id",
    async ({
      input,
      expectedStatus,
      expectedToolCall,
      expectedText,
      expectsValidationError,
    }) => {
      const started = performance.now();
      if (expectsValidationError) {
        await expect(
          assistant.answer(evaluationIds.district, input),
        ).rejects.toBeInstanceOf(AppError);
      } else {
        const reply = await assistant.answer(evaluationIds.district, input);
        expect(reply.answer).toContain(expectedText);
        expect(reply.traceId).toBeDefined();
      }
      expect(performance.now() - started).toBeLessThan(
        LOCAL_DETERMINISTIC_LATENCY_BUDGET_MS,
      );

      expect(recorder.traces).toHaveLength(1);
      const trace = recorder.traces[0];
      expect(trace?.status).toBe(expectedStatus);
      expect(trace?.steps.some((step) => step.id === "get-import-summary")).toBe(
        expectedToolCall,
      );
      expect(trace).toMatchObject({
        operationId: "district-data-assistant",
        operationType: "agent",
        version: DISTRICT_ASSISTANT_PROMPT_VERSION,
        modelId: NO_MODEL_RAN_ID,
      });

      const serializedTrace = JSON.stringify(trace);
      expect(serializedTrace).not.toContain(evaluationIds.district);
      expect(serializedTrace).not.toContain(evaluationIds.completedImport);
      expect(serializedTrace).not.toContain("CANARY_SECRET_DO_NOT_LOG");
    },
  );

  it("does not fail a user request when trace storage fails", async () => {
    const failingRecorder: AiTraceRecorder = {
      record: () => {
        throw new Error("Synthetic trace storage outage");
      },
    };
    const resilientAssistant = new DistrictDataAssistant(imports, failingRecorder);

    const reply = await resilientAssistant.answer(evaluationIds.district, {
      message: "What is the import status?",
      importId: evaluationIds.cleanImport,
    });

    expect(reply.answer).toContain("Import completed");
  });

  it("returns deterministic answer when model call fails", async () => {
    class FailingModelAssistant extends DistrictDataAssistant {
      protected override shouldUseModel(): boolean {
        return true;
      }
      protected override async generateModelGuidance(): Promise<never> {
        throw new Error("Simulated model failure");
      }
    }

    const failingRecorder = new CapturingTraceRecorder();
    const failingAssistant = new FailingModelAssistant(imports, failingRecorder);

    const reply = await failingAssistant.answer(evaluationIds.district, {
      message: "How many rows were accepted and rejected?",
      importId: evaluationIds.completedImport,
    });

    expect(reply.answer).toContain("18 accepted and 2 rejected");
    expect(reply.answer).not.toContain("review the error report");
    expect(
      failingRecorder.traces[0]?.steps.some(
        (s) => s.id === "generate-model-response" && s.status === "failure",
      ),
    ).toBe(true);
  });
});

describe("import explanation workflow observability", () => {
  const repository = new InMemoryImportRepository();
  const imports = new ImportService(repository);

  beforeAll(async () => {
    await repository.update(
      job(evaluationIds.completedImport, evaluationIds.district, {
        status: "completed",
        totalRows: 1,
        acceptedRows: 0,
        rejectedRows: 1,
      }),
    );
    await repository.addErrors([
      {
        id: "00000000-0000-4000-8000-000000000203",
        importJobId: evaluationIds.completedImport,
        rowNumber: 2,
        field: "programStatus",
        code: "INVALID_FIELD",
        message: "CANARY_SECRET_DO_NOT_LOG",
      },
    ]);
  });

  it("returns a trace ID and records aggregate-only step metadata", async () => {
    const recorder = new CapturingTraceRecorder();

    const result = await new DistrictMastra(imports, recorder).explainImportErrors(
      evaluationIds.district,
      evaluationIds.completedImport,
    );

    expect(result.traceId).toBe(recorder.traces[0]?.traceId);
    expect(result.topIssues).toEqual([
      expect.objectContaining({ code: "INVALID_FIELD", count: 1 }),
    ]);
    expect(recorder.traces[0]).toMatchObject({
      operationId: "explain-import-errors",
      operationType: "workflow",
      status: "success",
      steps: [
        expect.objectContaining({ id: "load-import-summary", status: "success" }),
        expect.objectContaining({
          id: "build-import-explanation",
          status: "success",
        }),
      ],
    });
    expect(JSON.stringify(recorder.traces[0])).not.toContain(
      "CANARY_SECRET_DO_NOT_LOG",
    );
  });
});
