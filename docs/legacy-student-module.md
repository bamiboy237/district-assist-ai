# JavaScript-to-TypeScript migration note

The starter API originally kept students in one global in-memory array and exposed unscoped `/api/v1/students` endpoints. This was useful for learning Express, but it could not preserve records across restarts and could not model district ownership.

The current implementation keeps the HTTP response convention (`data` on success; structured `error` on failure) while intentionally changing the resource boundary to `/api/v1/districts/:districtId/students`. Strict TypeScript types describe code-controlled values; Zod still validates every HTTP and CSV input at runtime. PostgreSQL’s `(district_id, external_id)` unique constraint is the final duplicate-defense layer.
