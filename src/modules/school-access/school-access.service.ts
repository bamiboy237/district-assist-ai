import type { SchoolAccessRepository } from "./school-access.repository.js";

export class SchoolAccessService {
  constructor(private readonly repository: SchoolAccessRepository) {}

  async replace(
    districtId: string,
    clerkUserId: string,
    schoolNames: string[],
  ): Promise<string[]> {
    const normalized = [...new Set(schoolNames)].sort((a, b) => a.localeCompare(b));
    await this.repository.replace(districtId, clerkUserId, normalized);
    return normalized;
  }

  list(districtId: string, clerkUserId: string): Promise<string[]> {
    return this.repository.list(districtId, clerkUserId);
  }
}
