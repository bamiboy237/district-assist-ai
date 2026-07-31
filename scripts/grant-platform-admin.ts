import { pool } from "../src/database/pool.js";
import { PgPlatformAdminRepository } from "../src/modules/platform-admins/platform-admin.repository.js";
import { PlatformAdminService } from "../src/modules/platform-admins/platform-admin.service.js";
import { AuditService } from "../src/modules/audit/audit.service.js";
import { PgAuditRepository } from "../src/modules/audit/audit.repository.js";

const userId = process.argv[2];

if (!userId?.startsWith("user_")) {
  console.error("Usage: npm run grant:platform-admin -- user_<clerk-user-id>");
  process.exitCode = 1;
} else {
  try {
    await new PlatformAdminService(new PgPlatformAdminRepository()).grant(userId);
    await new AuditService(new PgAuditRepository()).record({
      actorUserId: "bootstrap-cli",
      action: "platform_administrator.granted",
      metadata: { targetUserId: userId },
    });
    console.log(`Granted platform administrator access to ${userId}.`);
  } finally {
    await pool.end();
  }
}
