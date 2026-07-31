# Deployment notes

## Required services

- Clerk with Organizations enabled and organization membership required.
- A managed PostgreSQL instance with TLS, backups, and restricted network access.
- A TLS-terminating gateway and centralized structured-log retention.

## Configuration

Set `DATABASE_URL`, `DATABASE_SSL`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGIN`, `LOG_LEVEL`, `REQUEST_TIMEOUT_MS`, and `SHUTDOWN_TIMEOUT_MS` through the deployment platform. Do not commit a populated `.env` file.

One Clerk Organization represents one district. Create the organization and its users in Clerk, then create the district with its `org_...` identifier. Clerk's active-organization claim is the authentication boundary; the database only maps that identifier to district data.

If a pre-Clerk database has existing districts, bind each one with the platform-only `PUT /api/v1/districts/:districtId/clerk-organization` operation before granting staff access.

After migrations, bootstrap the first internal platform administrator:

```bash
npm run grant:platform-admin:prod -- user_<clerk-user-id>
```

## Release sequence

1. Run `npm ci` and `npm run check` in CI.
2. Build the image with `npm run build`.
3. Run `npm run migrate:prod` once from the built release against the target database.
4. Run `npm run migrate:mastra:prod` once to prepare Mastra's PostgreSQL workflow storage.
5. Deploy the application revision with the Clerk and OpenAI secrets configured.
6. Confirm `/health`, `/ready`, and an authenticated request for an active Clerk organization.

Application database migrations are forward-only. Mastra manages its tables in the
`mastra` PostgreSQL schema through the pinned `@mastra/pg` adapter. Review package
upgrades and both migration steps before each release.
