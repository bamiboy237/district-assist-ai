import type { DistrictRepository } from "./district.repository.js";
import type { CreateDistrictInput, District } from "./district.schema.js";
import { randomUUID } from "node:crypto";
import { NotFoundError } from "../../shared/errors/app-error.js";

export class DistrictService {
  constructor(private readonly repo: DistrictRepository) {}

  async createDistrict(input: CreateDistrictInput): Promise<District> {
    const district: District = {
      id: randomUUID(),
      name: input.name,
      stateCode: input.stateCode.toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.repo.create(district, input.clerkOrganizationId);
  }

  async getDistrict(id: string): Promise<District> {
    const district = await this.repo.findById(id);
    if (!district) throw new NotFoundError("District");
    return district;
  }

  async assertOrganizationAccess(
    districtId: string,
    clerkOrganizationId: string,
  ): Promise<void> {
    const district = await this.repo.findByIdAndClerkOrganizationId(
      districtId,
      clerkOrganizationId,
    );
    if (!district) throw new NotFoundError("District");
  }

  async getDistrictForOrganization(clerkOrganizationId: string): Promise<District> {
    const district = await this.repo.findByClerkOrganizationId(clerkOrganizationId);
    if (!district) throw new NotFoundError("District");
    return district;
  }

  async bindClerkOrganization(
    districtId: string,
    clerkOrganizationId: string,
  ): Promise<void> {
    await this.getDistrict(districtId);
    await this.repo.bindClerkOrganizationId(districtId, clerkOrganizationId);
  }

  async updateDistrict(
    id: string,
    input: { name?: string | undefined; stateCode?: string | undefined },
  ): Promise<District> {
    const district = await this.getDistrict(id);
    const updated: District = {
      id: district.id,
      name: input.name ?? district.name,
      stateCode: input.stateCode?.toUpperCase() ?? district.stateCode,
      createdAt: district.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.update(updated);
  }
}
