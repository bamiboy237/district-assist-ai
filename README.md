# DistrictAssist AI

DistrictAssist is a multi-tenant backend for student-program imports and support plans. A district uploads a CSV; the service validates each row, keeps valid records, and produces a useful error report for the rest.

The tenancy model is deliberate: one Clerk Organization maps to one district. Clerk owns identities, organization membership, invitations, and active-organization context. PostgreSQL owns the district's operational data.

## How requests are authorized

Every `/api/v1` request goes through Clerk's Express middleware. The API reads the verified Clerk identity with `getAuth(req)` and checks that the token's active `org_id` belongs to the district in the URL. A user cannot obtain another district's records just by changing a route parameter.

| Clerk role             | DistrictAssist access                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `org:admin`            | District coordinator: import and edit students, manage support plans |
| `org:member`           | School specialist: assigned-school records and support plans         |
| Platform administrator | Provision districts and has cross-district operational access        |

Platform administrators are application staff, not a district role. Bootstrap one after migrations with their Clerk user ID:

```bash
npm run grant:platform-admin -- user_...
```

## Run locally

You need Node 24, npm, Docker, and a Clerk application with Organizations enabled.

```bash
cp .env.example .env
docker compose up -d db
npm ci
npm run migrate
npm run migrate:mastra
npm run dev
```

Set `CLERK_SECRET_KEY` and `OPENAI_API_KEY` in `.env`. Do not commit the populated file. In Clerk, enable Organizations and require organization membership. Create an organization for a district before creating its DistrictAssist record.

`GET /health` checks the process. `GET /ready` checks PostgreSQL. They stay public for platform health checks; all `/api/v1` routes require Clerk authentication.

## Run the web client

The React operations console lives in `web/`. It is a separate browser client, so it uses only public configuration values and receives a current Clerk session token for API calls.

```bash
cp web/.env.example web/.env
npm install --prefix web
npm run dev --prefix web
```

Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` in `web/.env`. Start the API separately with `npm run dev`. The active Clerk organization is resolved by `GET /api/v1/districts/current`. If it has no workspace yet, an `org:admin` can create one directly in the web client. Never put `CLERK_SECRET_KEY`, `DATABASE_URL`, or `OPENAI_API_KEY` in a `VITE_` variable.

## District provisioning

1. Create or select the district's Organization in Clerk.
2. Make the district coordinator an `org:admin`.
3. Sign in to the web client and create the district workspace.
4. Add staff through Clerk invitations and assign `org:admin` or `org:member`.

The web client sends only the district name and state code to `POST /api/v1/districts`. The API derives `clerkOrganizationId` from the verified active-organization claim and stores that unique mapping; it never accepts a browser-provided organization ID as proof of access. Platform administrators may still provide `clerkOrganizationId` for managed provisioning.

For an existing district created before Clerk was enabled, a platform administrator can bind it once with `PUT /api/v1/districts/:districtId/clerk-organization`. This is a migration operation; it is not available to district staff.

District coordinators assign each specialist to schools through `PUT /api/v1/districts/:districtId/specialists/:clerkUserId/schools`. Student lists, individual records, and support plans then enforce that assignment server-side.

## Import and assistant behavior

CSV imports use partial acceptance. Student inserts, row errors, and the completed job status commit in one transaction. Retrying identical file content for the same district reuses the existing job instead of duplicating students.

The assistant receives aggregate import counts and error categories through a district-scoped Mastra tool. With `OPENAI_API_KEY` configured, the model must call that tool and may select only a vetted guidance code. Application code renders every count, status, error category, and guidance sentence, so model prose cannot replace verified facts. If the model times out, fails, or skips the tool call, the API returns the deterministic factual summary.

Import-error explanations run as a registered Mastra workflow with typed load and explanation steps. Workflow run state uses PostgreSQL outside tests. Traces record versions, timing, tool steps, status, and token usage without storing prompts or student data.

District provisioning, tenant rebinding, specialist scope changes, and support-plan changes create append-only audit events containing identifiers and status metadata, not student names or plan text.

## API

| Resource      | Operations                                                      |
| ------------- | --------------------------------------------------------------- |
| Districts     | Provision, read, and update districts                           |
| Students      | Create, list, filter, read, and update district-scoped students |
| Imports       | Upload CSVs and inspect import status and row errors            |
| Support plans | Create, list, and update plans with guarded transitions         |
| Assistant     | Explain one authorized import using bounded aggregate data      |

Successful responses use `{ "data": ... }`. Errors have a stable code, a safe message, and a request ID for support and log correlation.

## Deployment

Use a managed PostgreSQL service with TLS and backups, and set `DATABASE_SSL=true` when required. Run `npm run migrate:prod` and `npm run migrate:mastra:prod` from the built release as one-off steps before deploying application instances; the server does not run schema changes at boot.

Store `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, and allowed `CORS_ORIGIN` values in the deployment platform's secret manager. Deploy behind TLS. The local Compose database is for development only.

## Data handling

This repository must not contain real student records, exports, credentials, or screenshots with identifying data. Before using it with a district, complete the organization's privacy, security, retention, access-review, incident-response, and vendor requirements. The code provides technical controls; it is not a FERPA or security compliance certification.

## Checks

```bash
npm run check
npm run build
```

The normal suite is deterministic and makes no paid model calls. Run the opt-in live model evaluation separately when `OPENAI_API_KEY` is configured:

```bash
npm run test:ai:live
```
