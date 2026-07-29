import type { District } from "./district.schema.js"

export interface DistrictRepository {
    create(district: District): Promise<District>;
    findById(id: string): Promise<District | undefined>;
}

export class InMemoryDistrictRepository implements DistrictRepository {
  private districts = new Map<string, District>();

  async create(district: District): Promise<District> {
    this.districts.set(district.id, district);
    return district;
  }

  async findById(id: string): Promise<District | undefined> {
    return this.districts.get(id);
  }
}