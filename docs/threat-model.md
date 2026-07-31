# Threat model

## Assets

Student-program records, support plans, import metadata, Clerk credentials, PostgreSQL credentials, and service availability.

## Controls

- Clerk verifies session tokens before every API request.
- The active Clerk Organization must map to the district in the request path.
- Specialist reads are limited to explicitly assigned school names.
- Parameterized SQL and district predicates prevent cross-tenant query access.
- Request logs redact authorization headers and avoid recording CSV row content.
- Helmet, CORS configuration, JSON limits, upload limits, rate limiting, and readiness checks reduce common HTTP and operational risk.
- The assistant only receives aggregate import data from the caller's authorized district.
- Privileged tenant and support-plan changes create append-only audit events.

## Abuse cases

- Broken object-level authorization: changing a district, student, import, or plan ID must produce a scoped 403 or non-disclosing 404.
- SQL injection: all repository values remain parameterized; dynamic query fragments come only from server-owned clauses.
- File-upload abuse: CSV uploads are type-checked, limited to 1 MB, decoded as strict UTF-8, and validated before transactional persistence.
- CSV formula injection: the service does not currently export spreadsheets. Any future export must neutralize cells beginning with `=`, `+`, `-`, or `@`.
- Prompt injection and secret extraction: messages and imported text are untrusted; the assistant has no arbitrary SQL or secret-reading tool.
- Cross-tenant AI memory: conversational memory is not enabled.
- Secret leakage: authorization headers and provider credentials are redacted, and AI traces omit prompts and district/import identifiers.

## Operational responsibilities

The deployment team must protect secrets, enforce MFA and appropriate sign-in policies in Clerk, review membership changes, retain logs appropriately, maintain backups, and complete privacy/compliance work before handling real student data.
