# DistrictAssist AI

DistrictAssist is a multi-tenant backend for managing student support programs across school districts.

District staff can upload student rosters as CSV files. The API validates each row, imports valid records, reports rejected rows, and provides AI-assisted explanations for common import errors.

## Features

- Multi-tenant architecture with one Clerk Organization per district
- CSV imports with row-level validation
- Partial acceptance of valid records
- Detailed error reports for rejected rows
- AI-assisted import explanations
- School-level access controls for specialists
- Idempotent imports that prevent duplicate records
- Audit logs for administrative and support-plan changes

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Frontend:** React
- **Database:** PostgreSQL
- **Authentication:** Clerk Organizations
- **AI workflows:** Mastra
- **Language model:** OpenAI
- **Testing:** Vitest
- **Development:** Docker

## How It Works

Each school district maps to a Clerk Organization.

Clerk manages authentication, organization membership, invitations, and user roles. PostgreSQL stores district data, including students, imports, support plans, specialist assignments, and audit events.

Every `/api/v1` request verifies that the authenticated user's active Clerk organization matches the district being accessed. District coordinators can manage district-wide records, while specialists only have access to their assigned schools.

## CSV Imports

District staff upload student rosters as CSV files.

The import pipeline validates every row and uses partial acceptance. Valid students are imported, while invalid rows are returned with specific error details.

Student records, row errors, and the final import status are written in a single transaction. Uploading the same file more than once for the same district reuses the existing import job instead of creating duplicate students.

## AI Assistant

The assistant helps district staff understand why records failed during an import.

It does not receive student names, raw CSV data, or support-plan content. Instead, it accesses aggregate import counts and error categories through a district-scoped Mastra tool.

The model can only select from predefined guidance codes. Application code generates the final counts, statuses, error categories, and guidance text.

If the model fails, times out, or skips the required tool call, the API returns a deterministic summary instead.

## Authorization

DistrictAssist supports three access levels:

| Role | Access |
| --- | --- |
| `org:admin` | Import and edit students, manage support plans, and assign specialists |
| `org:member` | Access students and support plans for assigned schools |
| Platform administrator | Provision and manage districts across the platform |

Changing a district ID in the URL does not grant access to another district's records.

## API Resources

| Resource | Supported operations |
| --- | --- |
| Districts | Create, read, and update districts |
| Students | Create, list, filter, read, and update students |
| Imports | Upload CSV files and inspect import results |
| Support plans | Create, list, and update student support plans |
| Assistant | Explain import results using aggregate data |

Successful responses use the following format:

```json
{
  "data": {}
}
```

Errors include a stable error code, a safe message, and a request ID for debugging.

## Running Locally

### Requirements

- Node.js 24
- npm
- Docker
- A Clerk application with Organizations enabled

### Start the API

```bash
cp .env.example .env
docker compose up -d db
npm ci
npm run migrate
npm run migrate:mastra
npm run dev
```

Set the following values in `.env`:

```env
CLERK_SECRET_KEY=
OPENAI_API_KEY=
```

### Start the Web Client

```bash
cp web/.env.example web/.env
npm install --prefix web
npm run dev --prefix web
```

Set the following values in `web/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=
VITE_API_BASE_URL=
```

The API and web client run as separate applications. The web client authenticates API requests using the user's current Clerk session token.

## Platform Administration

Grant platform administrator access after running migrations:

```bash
npm run grant:platform-admin -- user_...
```

Platform administrators can provision districts and bind older district records to Clerk Organizations.

## Health Checks

```text
GET /health
GET /ready
```

`/health` checks that the API process is running.

`/ready` checks the PostgreSQL connection.

Both endpoints are public. All `/api/v1` routes require authentication.

## Testing

Run the standard checks:

```bash
npm run check
npm run build
```

The normal test suite is deterministic and does not make paid model calls.

Run the optional live AI evaluation with:

```bash
npm run test:ai:live
```
