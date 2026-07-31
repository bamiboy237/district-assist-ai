import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { PoolClient } from "pg";
import { pool } from "../../database/pool.js";
import { runMigrations } from "../../database/migrate.js";
import { PgDistrictRepository } from "./district.repository.js";
import { DistrictService } from "./district.service.js";
import { PgImportRepository } from "../imports/import.repository.js";
import { ImportService } from "../imports/import.service.js";

const integration =
  process.env.RUN_DATABASE_TESTS === "true" ? describe : describe.skip;

integration("DistrictService with PostgreSQL", () => {
  let client: PoolClient;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
  });

  afterEach(async () => {
    await client.query("ROLLBACK");
    client.release();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates and reads a district from PostgreSQL", async () => {
    const repository = new PgDistrictRepository(client);
    const service = new DistrictService(repository);

    const created = await service.createDistrict({
      name: "North District",
      stateCode: "ok",
      clerkOrganizationId: "org_north",
    });

    const found = await repository.findById(created.id);

    expect(found).toEqual(created);
    expect(found?.stateCode).toBe("OK");
  });

  it("returns undefined when a district does not exist", async () => {
    const repository = new PgDistrictRepository(client);

    const found = await repository.findById("00000000-0000-0000-0000-000000000000");

    expect(found).toBeUndefined();
  });

  it("commits import results atomically and reuses an identical upload", async () => {
    const districts = new DistrictService(new PgDistrictRepository(client));
    const district = await districts.createDistrict({
      name: "North District",
      stateCode: "IL",
      clerkOrganizationId: `org_${crypto.randomUUID()}`,
    });
    const imports = new ImportService(new PgImportRepository(client));
    const csv = Buffer.from(
      [
        "external_id,first_name,last_name,grade_level,school_name,program_status",
        "S-1,Ada,Learner,7,North Middle,active",
        "S-2,Grace,Student,13,North Middle,monitoring",
      ].join("\n"),
    );

    const first = await imports.processCsv(district.id, "students.csv", csv);
    const replay = await imports.processCsv(district.id, "renamed.csv", csv);
    const students = await client.query(
      "SELECT COUNT(*)::int AS count FROM students WHERE district_id = $1",
      [district.id],
    );
    const errors = await client.query(
      "SELECT COUNT(*)::int AS count FROM import_errors WHERE import_job_id = $1",
      [first.job.id],
    );

    expect(first).toMatchObject({
      reused: false,
      job: { status: "completed", acceptedRows: 1, rejectedRows: 1 },
    });
    expect(replay).toMatchObject({ reused: true, job: { id: first.job.id } });
    expect(students.rows[0]?.count).toBe(1);
    expect(errors.rows[0]?.count).toBeGreaterThan(0);
  });
});
