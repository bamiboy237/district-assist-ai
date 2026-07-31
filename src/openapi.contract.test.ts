import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;
type PathMap = Record<string, Record<string, unknown>>;

const operations = new Set(["get", "post", "put", "patch", "delete"]);

async function loadContract(): Promise<JsonObject> {
  const path = new URL("../docs/openapi.json", import.meta.url);
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function findReferences(value: unknown, refs: string[] = []): string[] {
  if (isObject(value)) {
    if (typeof value["$ref"] === "string") refs.push(value["$ref"] as string);
    for (const val of Object.values(value)) findReferences(val, refs);
  }
  if (Array.isArray(value)) {
    for (const item of value) findReferences(item, refs);
  }
  return refs;
}

describe("OpenAPI contract", () => {
  let contract: JsonObject;
  let paths: PathMap;

  beforeAll(async () => {
    contract = await loadContract();
    const p = contract.paths;
    if (!isObject(p)) throw new Error("paths must be an object");
    paths = p as PathMap;
  });

  it("is valid OpenAPI 3", () => {
    expect(contract.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(contract.info).toBeDefined();
    expect(isObject(contract.info)).toBe(true);
    expect((contract.info as JsonObject).title).toBe("DistrictAssist AI");
  });

  it("contains all expected API paths", () => {
    const expectedPaths = [
      "/health",
      "/ready",
      "/api/v1/districts",
      "/api/v1/districts/current",
      "/api/v1/districts/{districtId}/students",
      "/api/v1/districts/{districtId}/imports/students",
      "/api/v1/districts/{districtId}/imports/{importId}",
      "/api/v1/districts/{districtId}/imports/{importId}/errors",
      "/api/v1/districts/{districtId}/students/{studentId}/support-plans",
      "/api/v1/districts/{districtId}/assistant/messages",
    ];
    for (const p of expectedPaths) {
      expect(paths[p]).toBeDefined();
    }
    expect(Object.keys(paths).length).toBeGreaterThanOrEqual(expectedPaths.length);
  });

  it("every operation has a valid method", () => {
    for (const methods of Object.values(paths)) {
      if (!isObject(methods)) continue;
      for (const method of Object.keys(methods)) {
        expect(operations.has(method)).toBe(true);
      }
    }
  });

  it("resolves all local $ref references", () => {
    const refs = findReferences(contract);
    for (const ref of refs) {
      if (!ref.startsWith("#/")) continue;
      const parts = ref.slice(2).split("/");
      let current: unknown = contract;
      for (const part of parts) {
        if (!isObject(current) || !(part in current))
          throw new Error(`Unresolvable reference: ${ref} (failed at '${part}')`);
        current = current[part];
      }
    }
  });

  it("registers component schemas", () => {
    const schemas = (isObject(contract.components) ? contract.components : {}).schemas;
    if (!isObject(schemas)) throw new Error("components.schemas must be an object");
    const expectedSchemas = ["District", "Student", "ImportJob", "SupportPlan"];
    for (const name of expectedSchemas) {
      expect(schemas[name]).toBeDefined();
    }
  });
});
