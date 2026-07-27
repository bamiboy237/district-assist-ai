import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import { reset } from "./studentStore.js";

describe("GET /health", () => {
  it("should return 200 OK", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
  });
});

describe("POST /api/v1/students", () => {
  beforeEach(() => {
    reset();
  });

  it("should return 201 with valid body and id", async () => {
    const response = await request(app).post("/api/v1/students").send({
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 5,
      externalId: "ext-1",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty("id");
  });

  it("should return 400 with invalid body", async () => {
    const response = await request(app).post("/api/v1/students").send({
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: "invalid",
      externalId: "ext-1",
    });

    expect(response.status).toBe(400);
  });

  it("should return 409 with duplicate externalId", async () => {
    const first = await request(app).post("/api/v1/students").send({
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 5,
      externalId: "ext-1",
    });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/students").send({
      firstName: "John",
      lastName: "Doe",
      gradeLevel: 5,
      externalId: "ext-1",
    });

    expect(second.status).toBe(409);
    expect(second.body.error).toHaveProperty("code", "DUPLICATE_EXTERNAL_ID");
  });
});

describe("GET /api/v1/students and /api/v1/students/:id", () => {
  beforeEach(() => {
    reset();
  });
  it("should return 200 for a valid student id", async () => {
    const created = await request(app).post("/api/v1/students").send({
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 5,
      externalId: "ext-1",
    });
    expect(created.status).toBe(201);

    const response = await request(app).get(
      `/api/v1/students/${created.body.data.id}`,
    );
    expect(response.status).toBe(200);
  });
  it("should return 404 for invalid student id", async () => {
    const response = await request(app).get(`/api/v1/students/999`);
    expect(response.status).toBe(404);
  });
  it("should return only students matching gradeLevel", async () => {
    const matchingStudent = await request(app).post("/api/v1/students").send({
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 7,
      externalId: "ext-7",
    });
    const nonMatchingStudent = await request(app)
      .post("/api/v1/students")
      .send({
        firstName: "John",
        lastName: "Doe",
        gradeLevel: 5,
        externalId: "ext-5",
      });
    expect(matchingStudent.status).toBe(201);
    expect(nonMatchingStudent.status).toBe(201);

    const response = await request(app).get("/api/v1/students?gradeLevel=7");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: matchingStudent.body.data.id,
        gradeLevel: 7,
      }),
    ]);
  });
});

describe("unmatched routes", () => {
  it("should return 404 with an error shape for a nonexistent route", async () => {
    const response = await request(app).get("/nonexistent");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });
});

describe("malformed JSON", () => {
  it("should return 400", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Content-Type", "application/json")
      .send('{"firstName":');

    expect(response.status).toBe(400);
  });
});
