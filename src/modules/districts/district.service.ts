import type { DistrictRepository } from './district.repository.js';
import type { createDistrictInput, District } from './district.schema.js';
import { randomUUID } from "node:crypto";

export class DistrictService {
  constructor(private readonly repo: DistrictRepository) { }

  async createDistrict(input: createDistrictInput): Promise<District> {
    const district: District = {
      id: randomUUID(),
      name: input.name,
      stateCode: input.stateCode.toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.repo.create(district);
  }
}