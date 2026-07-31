# Architecture

DistrictAssist is a modular Express application backed by PostgreSQL. Its request path is straightforward:

```text
Clerk middleware -> tenant check -> Zod validation -> service -> repository -> PostgreSQL
```

Clerk handles user identity, organization membership, invitations, and the active organization. The application maps a verified Clerk `org_id` to one district and scopes every district resource query by district ID. Coordinators have district-wide access; specialists receive explicit school assignments that constrain student and support-plan reads.

The import pipeline uses partial acceptance: valid rows persist and invalid rows become row-level errors. The final students, row errors, and job status commit transactionally. A district-scoped SHA-256 checksum makes retries idempotent. The current upload limit is 1 MB and protects process memory.

The assistant receives one narrow import-summary tool. It cannot issue arbitrary SQL, inspect another district, or make decisions about students. The model can select only a vetted guidance code; deterministic application code renders all factual output. Model failures fall back to an already validated aggregate summary, and traces omit prompts and domain identifiers.

Import-error explanations use a registered Mastra workflow:

```text
load authorized aggregate summary -> build typed deterministic explanation
```

Mastra stores workflow run state in the same PostgreSQL instance under the separate
`mastra` schema. Production startup does not create or alter those tables; the release
pipeline runs the Mastra storage migration explicitly.
