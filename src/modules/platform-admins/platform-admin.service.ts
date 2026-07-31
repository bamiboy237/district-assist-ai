import type { PlatformAdminRepository } from "./platform-admin.repository.js";

export class PlatformAdminService {
  constructor(private readonly repo: PlatformAdminRepository) {}

  grant(userId: string): Promise<void> {
    return this.repo.add(userId);
  }

  isAdmin(userId: string): Promise<boolean> {
    return this.repo.has(userId);
  }
}
