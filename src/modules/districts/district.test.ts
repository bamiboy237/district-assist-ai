import { describe, expect, it } from "vitest";
import { InMemoryDistrictRepository } from "./district.repository.js";
import { createDistrictSchema } from "./district.schema.js";
import { DistrictService } from "./district.service.js";

describe("DistrictService", () => {
  it("normalizes a state code before persisting the district", async () => {
    const service = new DistrictService(new InMemoryDistrictRepository());
    const district = await service.createDistrict({
      name: "North District",
      stateCode: "ok",
      clerkOrganizationId: "org_north",
    });
    expect(district.stateCode).toBe("OK");
  });
  it("rejects an invalid state code at the runtime boundary", () => {
    expect(
      createDistrictSchema.safeParse({
        name: "North District",
        stateCode: "TOO LONG",
        clerkOrganizationId: "org_north",
      }).success,
    ).toBe(false);
  });
});
