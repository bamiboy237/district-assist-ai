import type { Pool } from "pg";
import { pool } from "../../database/pool.js";

export interface SchoolAccessRepository {
  replace(
    districtId: string,
    clerkUserId: string,
    schoolNames: string[],
  ): Promise<void>;
  list(districtId: string, clerkUserId: string): Promise<string[]>;
}

export class PgSchoolAccessRepository implements SchoolAccessRepository {
  constructor(private readonly db: Pool = pool) {}

  async replace(
    districtId: string,
    clerkUserId: string,
    schoolNames: string[],
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM specialist_school_assignments
         WHERE district_id = $1 AND clerk_user_id = $2`,
        [districtId, clerkUserId],
      );
      for (const schoolName of schoolNames) {
        await client.query(
          `INSERT INTO specialist_school_assignments
           (district_id, clerk_user_id, school_name)
           VALUES ($1, $2, $3)`,
          [districtId, clerkUserId, schoolName],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(districtId: string, clerkUserId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT school_name FROM specialist_school_assignments
       WHERE district_id = $1 AND clerk_user_id = $2
       ORDER BY school_name ASC`,
      [districtId, clerkUserId],
    );
    return result.rows.map((row) => row.school_name as string);
  }
}

export class InMemorySchoolAccessRepository implements SchoolAccessRepository {
  private readonly assignments = new Map<string, string[]>();

  async replace(
    districtId: string,
    clerkUserId: string,
    schoolNames: string[],
  ): Promise<void> {
    this.assignments.set(this.key(districtId, clerkUserId), [...schoolNames]);
  }

  async list(districtId: string, clerkUserId: string): Promise<string[]> {
    return this.assignments.get(this.key(districtId, clerkUserId)) ?? [];
  }

  private key(districtId: string, clerkUserId: string): string {
    return `${districtId}:${clerkUserId}`;
  }
}
