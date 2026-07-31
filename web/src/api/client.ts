export type District = {
  id: string;
  name: string;
  stateCode: string;
  createdAt: string;
  updatedAt: string;
};

export type Student = {
  id: string;
  districtId: string;
  externalId: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  schoolName: string;
  programStatus: "active" | "monitoring" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type StudentPage = {
  data: Student[];
  page: { limit: number; cursor: string | null; nextCursor: string | null };
};

export type ImportJob = {
  id: string;
  districtId: string;
  filename: string;
  fileChecksum: string | null;
  status: "received" | "processing" | "completed" | "failed";
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportError = {
  id: string;
  importJobId: string;
  rowNumber: number;
  field: string | null;
  code: string;
  message: string;
};

export type ImportExplanation = {
  traceId: string;
  summary: string;
  topIssues: Array<{
    code: string;
    count: number;
    explanation: string;
    suggestedFix: string;
  }>;
  caveat: string;
};

export type AssistantReply = {
  answer: string;
  citations: Array<{ type: "import"; id: string }>;
};

export type SupportPlan = {
  id: string;
  districtId: string;
  studentId: string;
  status: "draft" | "active" | "completed" | "cancelled";
  goal: string;
  startDate: string;
  reviewDate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorBody = {
  error?: { code?: string; message?: string; requestId?: string };
};

type ApiEnvelope<T> = { data: T };

type TokenGetter = () => Promise<string | null>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export class DistrictAssistApi {
  private readonly baseUrl: URL;

  constructor(
    apiBaseUrl: string,
    private readonly getToken: TokenGetter,
  ) {
    this.baseUrl = new URL(apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`);
  }

  currentDistrict(signal: AbortSignal | null = null): Promise<District> {
    return this.fetchEnvelope("api/v1/districts/current", { signal });
  }

  createDistrict(
    input: { name: string; stateCode: string },
    signal: AbortSignal | null = null,
  ): Promise<District> {
    return this.fetchEnvelope("api/v1/districts", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      signal,
    });
  }

  listStudents(
    districtId: string,
    options: {
      search?: string;
      gradeLevel?: number;
      cursor?: string;
      signal?: AbortSignal;
    },
  ): Promise<StudentPage> {
    const query = new URLSearchParams({ limit: "25" });
    if (options.search) query.set("search", options.search);
    if (options.gradeLevel !== undefined)
      query.set("gradeLevel", String(options.gradeLevel));
    if (options.cursor) query.set("cursor", options.cursor);
    return this.fetchRaw(`api/v1/districts/${districtId}/students?${query}`, {
      signal: options.signal ?? null,
    });
  }

  uploadStudentCsv(
    districtId: string,
    file: File,
    options: { signal?: AbortSignal; onProgress: (percent: number) => void },
  ): Promise<{ job: ImportJob; replayed: boolean }> {
    return this.upload(
      `api/v1/districts/${districtId}/imports/students`,
      file,
      options,
    );
  }

  importJob(
    districtId: string,
    importId: string,
    signal: AbortSignal | null = null,
  ): Promise<ImportJob> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}/imports/${importId}`, {
      signal,
    });
  }

  importErrors(
    districtId: string,
    importId: string,
    signal: AbortSignal | null = null,
  ): Promise<ImportError[]> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/imports/${importId}/errors`,
      { signal },
    );
  }

  explainImportErrors(
    districtId: string,
    importId: string,
    signal: AbortSignal | null = null,
  ): Promise<ImportExplanation> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/imports/${importId}/explain-errors`,
      {
        method: "POST",
        signal,
      },
    );
  }

  askAboutImport(
    districtId: string,
    input: { message: string; importId: string },
    signal: AbortSignal | null = null,
  ): Promise<AssistantReply> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}/assistant/messages`, {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      signal,
    });
  }

  getStudent(
    districtId: string,
    studentId: string,
    signal: AbortSignal | null = null,
  ): Promise<Student> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}/students/${studentId}`, {
      signal,
    });
  }

  createStudent(
    districtId: string,
    input: {
      externalId: string;
      firstName: string;
      lastName: string;
      gradeLevel: number;
      schoolName: string;
      programStatus: Student["programStatus"];
    },
    signal: AbortSignal | null = null,
  ): Promise<Student> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}/students`, {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      signal,
    });
  }

  updateStudent(
    districtId: string,
    studentId: string,
    input: Partial<{
      externalId: string;
      firstName: string;
      lastName: string;
      gradeLevel: number;
      schoolName: string;
      programStatus: Student["programStatus"];
    }>,
    signal: AbortSignal | null = null,
  ): Promise<Student> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      signal,
    });
  }

  getDistrict(
    districtId: string,
    signal: AbortSignal | null = null,
  ): Promise<District> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}`, { signal });
  }

  updateDistrict(
    districtId: string,
    input: { name?: string; stateCode?: string },
    signal: AbortSignal | null = null,
  ): Promise<District> {
    return this.fetchEnvelope(`api/v1/districts/${districtId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      signal,
    });
  }

  listSupportPlans(
    districtId: string,
    studentId: string,
    signal: AbortSignal | null = null,
  ): Promise<SupportPlan[]> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/students/${studentId}/support-plans`,
      { signal },
    );
  }

  createSupportPlan(
    districtId: string,
    studentId: string,
    input: { goal: string; startDate: string; reviewDate: string },
    signal: AbortSignal | null = null,
  ): Promise<SupportPlan> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/students/${studentId}/support-plans`,
      {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal,
      },
    );
  }

  updateSupportPlan(
    districtId: string,
    planId: string,
    input: {
      goal?: string;
      status?: SupportPlan["status"];
      reviewDate?: string;
      version: number;
    },
    signal: AbortSignal | null = null,
  ): Promise<SupportPlan> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/support-plans/${planId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal,
      },
    );
  }

  getSpecialistSchools(
    districtId: string,
    clerkUserId: string,
    signal: AbortSignal | null = null,
  ): Promise<{ schoolNames: string[] }> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/specialists/${clerkUserId}/schools`,
      { signal },
    );
  }

  setSpecialistSchools(
    districtId: string,
    clerkUserId: string,
    schoolNames: string[],
    signal: AbortSignal | null = null,
  ): Promise<{ schoolNames: string[] }> {
    return this.fetchEnvelope(
      `api/v1/districts/${districtId}/specialists/${clerkUserId}/schools`,
      {
        method: "PUT",
        body: JSON.stringify({ schoolNames }),
        headers: { "Content-Type": "application/json" },
        signal,
      },
    );
  }

  fetcher<T>(url: string): Promise<T> {
    return this.fetchEnvelope<T>(url);
  }

  fetcherRaw<T>(url: string): Promise<T> {
    return this.fetchRaw<T>(url);
  }

  private async fetchEnvelope<T>(path: string, init: RequestInit = {}): Promise<T> {
    const body = await this.fetchRaw<ApiEnvelope<T>>(path, init);
    return body.data;
  }

  private async fetchRaw<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        headers,
        signal: init.signal ?? null,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ApiError(
        "We could not reach DistrictAssist. Check your connection and try again.",
        0,
        undefined,
        null,
      );
    }

    const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
    if (!response.ok)
      throw toApiError(response.status, response.headers.get("X-Request-Id"), body);
    return body;
  }

  private async upload(
    path: string,
    file: File,
    options: { signal?: AbortSignal; onProgress: (percent: number) => void },
  ): Promise<{ job: ImportJob; replayed: boolean }> {
    const token = await this.getToken();

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const abort = () => request.abort();
      options.signal?.addEventListener("abort", abort, { once: true });

      request.open("POST", new URL(path, this.baseUrl).toString());
      request.setRequestHeader("Accept", "application/json");
      if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable)
          options.onProgress(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener("load", () => {
        options.signal?.removeEventListener("abort", abort);
        const body = parseJsonBody(request) as ApiEnvelope<ImportJob> & ApiErrorBody;
        if (request.status < 200 || request.status >= 300) {
          reject(
            toApiError(request.status, request.getResponseHeader("X-Request-Id"), body),
          );
          return;
        }
        resolve({
          job: body.data,
          replayed: request.getResponseHeader("Idempotent-Replayed") === "true",
        });
      });
      request.addEventListener("error", () => {
        options.signal?.removeEventListener("abort", abort);
        reject(
          new ApiError(
            "The CSV could not be uploaded. Check your connection and try again.",
            0,
            undefined,
            null,
          ),
        );
      });
      request.addEventListener("abort", () => {
        options.signal?.removeEventListener("abort", abort);
        reject(new DOMException("The request was cancelled.", "AbortError"));
      });

      const form = new FormData();
      form.append("file", file);
      request.send(form);
    });
  }
}

function parseJsonBody(request: XMLHttpRequest): unknown {
  try {
    return JSON.parse(request.responseText) as unknown;
  } catch {
    return {};
  }
}

function toApiError(
  status: number,
  requestId: string | null,
  body: ApiErrorBody,
): ApiError {
  return new ApiError(
    body.error?.message ?? "The request could not be completed.",
    status,
    body.error?.code,
    body.error?.requestId ?? requestId,
  );
}
