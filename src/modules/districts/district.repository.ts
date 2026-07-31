import type { Pool, PoolClient } from "pg";
import { pool } from "../../database/pool.js";
import type { District } from "./district.schema.js";

type DatabaseClient = Pool | PoolClient;

export class PgDistrictRepository implements DistrictRepository {
  constructor(private readonly db: DatabaseClient = pool) {}

  async create(district: District, clerkOrganizationId: string): Promise<District> {
    await this.db.query(
      `INSERT INTO districts
       (id, name, state_code, clerk_organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        district.id,
        district.name,
        district.stateCode,
        clerkOrganizationId,
        district.createdAt,
        district.updatedAt,
      ],
    );
    return district;
  }

  async findById(id: string): Promise<District | undefined> {
    const result = await this.db.query(
      `SELECT id, name, state_code, created_at, updated_at
      FROM districts WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? this.toDistrict(result.rows[0]) : undefined;
  }

  async findByIdAndClerkOrganizationId(
    id: string,
    clerkOrganizationId: string,
  ): Promise<District | undefined> {
    const result = await this.db.query(
      `SELECT id, name, state_code, created_at, updated_at
       FROM districts WHERE id = $1 AND clerk_organization_id = $2`,
      [id, clerkOrganizationId],
    );
    return result.rows[0] ? this.toDistrict(result.rows[0]) : undefined;
  }

  async findByClerkOrganizationId(
    clerkOrganizationId: string,
  ): Promise<District | undefined> {
    const result = await this.db.query(
      `SELECT id, name, state_code, created_at, updated_at
       FROM districts WHERE clerk_organization_id = $1`,
      [clerkOrganizationId],
    );
    return result.rows[0] ? this.toDistrict(result.rows[0]) : undefined;
  }

  async update(district: District): Promise<District> {
    await this.db.query(
      `UPDATE districts SET name = $2, state_code = $3, updated_at = $4 WHERE id = $1`,
      [district.id, district.name, district.stateCode, district.updatedAt],
    );
    return district;
  }

  async bindClerkOrganizationId(
    id: string,
    clerkOrganizationId: string,
  ): Promise<void> {
    await this.db.query(
      "UPDATE districts SET clerk_organization_id = $2, updated_at = NOW() WHERE id = $1",
      [id, clerkOrganizationId],
    );
  }

  private toDistrict(row: Record<string, unknown>): District {
    return {
      id: row.id as string,
      name: row.name as string,
      stateCode: row.state_code as string,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}

export interface DistrictRepository {
  create(district: District, clerkOrganizationId: string): Promise<District>;
  findById(id: string): Promise<District | undefined>;
  findByIdAndClerkOrganizationId(
    id: string,
    clerkOrganizationId: string,
  ): Promise<District | undefined>;
  findByClerkOrganizationId(clerkOrganizationId: string): Promise<District | undefined>;
  update(district: District): Promise<District>;
  bindClerkOrganizationId(id: string, clerkOrganizationId: string): Promise<void>;
}

export class InMemoryDistrictRepository implements DistrictRepository {
  private districts = new Map<string, District>();
  private organizationIds = new Map<string, string>();

  async create(district: District, clerkOrganizationId: string): Promise<District> {
    this.districts.set(district.id, district);
    this.organizationIds.set(district.id, clerkOrganizationId);
    return district;
  }

  async findById(id: string): Promise<District | undefined> {
    return this.districts.get(id);
  }

  async findByIdAndClerkOrganizationId(
    id: string,
    clerkOrganizationId: string,
  ): Promise<District | undefined> {
    return this.organizationIds.get(id) === clerkOrganizationId
      ? this.districts.get(id)
      : undefined;
  }

  async findByClerkOrganizationId(
    clerkOrganizationId: string,
  ): Promise<District | undefined> {
    for (const [districtId, organizationId] of this.organizationIds) {
      if (organizationId === clerkOrganizationId) return this.districts.get(districtId);
    }
    return undefined;
  }

  async update(district: District): Promise<District> {
    this.districts.set(district.id, district);
    return district;
  }

  async bindClerkOrganizationId(
    id: string,
    clerkOrganizationId: string,
  ): Promise<void> {
    this.organizationIds.set(id, clerkOrganizationId);
  }
}
