import type { ErrorRequestHandler, Request, Response } from "express";
import express from "express";
import { randomUUID } from "node:crypto";
import type { CreateStudentInput, Student } from "./student.types.js";
import { add, getAll } from "./studentStore.js";

type StudentQuery = {
  gradeLevel?: string;
  search?: string;
};

type HttpError = Error & {
  status?: number;
  type?: string;
};

const app = express();

app.use((request, response, next) => {
  request.requestId = randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  next();
});

app.use(express.json());

app.get("/health", (request, response) => {
  response.json({
    status: "ok",
    requestId: request.requestId,
    timestamp: new Date().toISOString(),
  });
});

app.post(
  "/api/v1/students",
  (
    request: Request<Record<string, never>, unknown, CreateStudentInput>,
    response: Response,
  ) => {
    const { firstName, lastName, gradeLevel, externalId } = request.body;

    if (
      !firstName ||
      !lastName ||
      !externalId ||
      !Number.isInteger(gradeLevel) ||
      gradeLevel < 1
    ) {
      return response.status(400).json({
        error: {
          code: "INVALID_BODY",
          message:
            "All fields are required and gradeLevel must be a positive integer",
        },
      });
    }

    if (getAll().some((student) => student.externalId === externalId)) {
      return response.status(409).json({
        error: {
          code: "DUPLICATE_EXTERNAL_ID",
          message: `Student with externalId ${externalId} already exists`,
        },
      });
    }

    const now = new Date().toISOString();
    const student: Student = {
      id: randomUUID(),
      firstName,
      lastName,
      gradeLevel,
      externalId,
      createdAt: now,
      updatedAt: now,
    };

    add(student);
    response.status(201).json({ data: student });
  },
);

app.get(
  "/api/v1/students",
  (
    request: Request<Record<string, never>, unknown, unknown, StudentQuery>,
    response: Response,
  ) => {
    const { gradeLevel, search } = request.query;
    let result = getAll();

    if (typeof gradeLevel === "string") {
      result = result.filter(
        (student) => student.gradeLevel === Number(gradeLevel),
      );
    }

    if (typeof search === "string") {
      const query = search.toLowerCase();
      result = result.filter(
        (student) =>
          student.firstName.toLowerCase().includes(query) ||
          student.lastName.toLowerCase().includes(query),
      );
    }

    response.json({ data: result });
  },
);

app.get(
  "/api/v1/students/:studentId",
  (request: Request<{ studentId: string }>, response: Response) => {
    const student = getAll().find(
      (currentStudent) => currentStudent.id === request.params.studentId,
    );

    if (!student) {
      return response
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Student not found" } });
    }

    response.json({ data: student });
  },
);

app.use((request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `No route matches ${request.method} ${request.originalUrl}`,
    },
  });
});

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  const httpError = error as HttpError;
  const status = httpError.status ?? 500;
  const isMalformedJson = httpError.type === "entity.parse.failed";

  if (status >= 500) {
    console.error("Unhandled error", error);
  }

  response.status(status).json({
    error: {
      code: isMalformedJson ? "INVALID_JSON" : "INTERNAL_ERROR",
      message:
        status >= 500 && process.env.NODE_ENV === "production"
          ? "Unexpected error"
          : httpError.message,
    },
  });
};

app.use(errorHandler);

export default app;
