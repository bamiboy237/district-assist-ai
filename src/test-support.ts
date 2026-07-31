import { createApp, type AppServices } from "./app.js";
import { DistrictMastra } from "./mastra/mastra.js";
import { DistrictService } from "./modules/districts/district.service.js";
import { InMemoryDistrictRepository } from "./modules/districts/district.repository.js";
import { ImportService } from "./modules/imports/import.service.js";
import { InMemoryImportRepository } from "./modules/imports/import.repository.js";
import { InMemoryStudentRepository } from "./modules/students/student.repository.js";
import { StudentService } from "./modules/students/student.service.js";
import { InMemorySupportPlanRepository } from "./modules/support-plans/support-plan.repository.js";
import { SupportPlanService } from "./modules/support-plans/support-plan.service.js";
import { PlatformAdminService } from "./modules/platform-admins/platform-admin.service.js";
import { InMemoryPlatformAdminRepository } from "./modules/platform-admins/platform-admin.repository.js";
import { SchoolAccessService } from "./modules/school-access/school-access.service.js";
import { InMemorySchoolAccessRepository } from "./modules/school-access/school-access.repository.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { InMemoryAuditRepository } from "./modules/audit/audit.repository.js";

export function makeTestServices(): AppServices {
  const studentRepository = new InMemoryStudentRepository();
  const students = new StudentService(studentRepository);
  const imports = new ImportService(new InMemoryImportRepository(studentRepository));
  return {
    districts: new DistrictService(new InMemoryDistrictRepository()),
    students,
    imports,
    supportPlans: new SupportPlanService(new InMemorySupportPlanRepository(), students),
    platformAdmins: new PlatformAdminService(new InMemoryPlatformAdminRepository()),
    schoolAccess: new SchoolAccessService(new InMemorySchoolAccessRepository()),
    audit: new AuditService(new InMemoryAuditRepository()),
    mastra: new DistrictMastra(imports),
  };
}

export async function makeTestApp() {
  const services = makeTestServices();
  await services.platformAdmins.grant("user_platform_admin");
  return createApp({
    services,
    resolveIdentity: () => ({
      userId: "user_platform_admin",
      organizationId: "org_test_district",
      organizationRole: "org:admin",
    }),
  });
}
