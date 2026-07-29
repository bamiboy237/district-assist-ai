import { describe, it, expect } from "vitest";
import { createDistrictSchema } from "./district.schema.js"
import { DistrictService } from "./district.service.js";
import { InMemoryDistrictRepository } from "./district.repository.js";
import request from "supertest";
import app from "../../app.js";

describe("createDistrictSchema", () => {
  it("accepts valid input", () => {
    const result = createDistrictSchema.safeParse({
      name: "Demo District",
      stateCode: "OK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createDistrictSchema.safeParse({
      name: "",
      stateCode: "OK",
    });
    expect(result.success).toBe(false);
  });
// this will be removed since we will use a drop down
  it ("rejects 3", () => {
    const result = createDistrictSchema.safeParse({
      name: "Demo District",
      stateCode: "OKL",
    });
    expect(result.success).toBe(false);
  });
});


describe("DistrictService", () => {
  it("creates a district with normalized state code", async () => {
    const repo = new InMemoryDistrictRepository();
    const service = new DistrictService(repo);

    const district = await service.createDistrict({
      name: "Demo",
      stateCode: "ok",  // lowercase!
    });

    expect(district.stateCode).toBe("OK");  // normalized
    expect(district.id).toBeTruthy();
  });

  it("persists to the repository", async () => {
    const repo = new InMemoryDistrictRepository();
    const service = new DistrictService(repo);

    const created = await service.createDistrict({
      name: "Demo",
      stateCode: "CA",
    });

    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });
});


describe("POST /api/v1/districts", () => {
  it("returns 201 with district data", async () => {
    const res = await request(app)
      .post("/api/v1/districts")
      .send({ name: "Demo District", stateCode: "OK" });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toBe("Demo District");
  });

  it("returns 400 for invalid state code", async () => {
    const res = await request(app)
      .post("/api/v1/districts")
      .send({ name: "Demo", stateCode: "TOOLONG" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});