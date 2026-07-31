# DistrictAssist AI

> A build-first curriculum for learning JavaScript, TypeScript, Node.js, backend engineering, and Mastra by creating a realistic education-technology platform.

## 0. Read this first

This document is both:

1. the product specification for DistrictAssist AI; and
2. your guided curriculum.

The folder containing this file is your starter project directory. Move or rename
that folder wherever you keep development projects, then work inside it. Do not
create a second `district-assist-ai` folder inside this one.

You are not expected to understand everything in this document on day one. The project is intentionally divided into small phases. Each phase introduces only a few new ideas, asks you to build something observable, and ends with tests and questions you should be able to answer.

Do not try to generate the entire application in one prompt. That would produce a repository you possess but cannot explain. Your goal is to become the engineer who can rebuild it.

### The learning contract

For every task:

1. Read the task and predict what the code needs to do.
2. Write the first attempt yourself.
3. Run it and observe the result.
4. Use documentation, error messages, and small experiments before asking for a complete solution.
5. When asking an AI assistant for help, show your attempt and ask for a hint or explanation first.
6. Add or update a test.
7. Commit the working change.
8. Explain the change aloud without looking at the code.

If you cannot explain a line, do not merge it into your main branch yet.

### What “done” means

A feature is done only when:

- its behavior is clear;
- invalid input is handled;
- expected failures return useful errors;
- tests cover the important behavior;
- secrets and student data do not appear in logs;
- formatting, linting, type-checking, and tests pass;
- you can explain the design and trade-offs.

### Safety rule: never use real student data

This project models software used by school districts. Student records are sensitive. Use fictional records only. Do not put real names, student IDs, school records, disability information, grades, immigration information, or API keys in the repository, screenshots, prompts, tests, logs, or issues.

The sample data should be obviously synthetic, such as:

```text
student_external_id: DEMO-1001
first_name: Ada
last_name: Learner
grade_level: 7
```

The AI features must not make disciplinary, placement, disability, immigration, funding, or other high-impact decisions. They may summarize supplied information, help staff find records, draft checklists, and identify missing fields. A human remains responsible for every consequential decision.

---

## 1. The product

### One-sentence pitch

DistrictAssist AI helps district staff import student-program data, detect data-quality problems, track support plans, and use a constrained AI assistant to understand records and prepare compliance work.

### Why this project fits the internship

The project exercises the exact engineering muscles in the job posting:

- JavaScript, TypeScript, and Node.js;
- reading and migrating an existing module;
- REST APIs;
- React integration;
- CSV and Excel imports;
- SQL and relational data modeling;
- tests and code review;
- legacy-behavior documentation;
- AI agents, tools, workflows, evaluation, and observability;
- careful handling of software that affects real people.

### Users

#### District coordinator

Imports district data, reviews validation failures, manages student support plans, and generates reports.

#### School specialist

Views students at an assigned school, updates support-plan activities, and asks the assistant factual questions about authorized records.

#### Platform administrator

Manages district accounts, integrations, and operational visibility. This role is mostly outside the first version.

### Core user journey

1. A coordinator creates a district.
2. The coordinator uploads a fictional CSV export from a student information system.
3. The backend parses and validates each row.
4. Valid rows are stored; invalid rows appear in an error report.
5. A specialist creates and updates a support plan for a student.
6. The specialist asks the AI assistant to summarize the plan or identify missing required fields.
7. The system records what happened without logging private content.
8. The coordinator exports a district-level report.

### MVP features

- Health-check endpoint
- District CRUD
- Student CRUD
- Student filtering and pagination
- CSV import with row-level validation
- Import status and error report
- Support-plan CRUD
- PostgreSQL persistence
- Structured error responses
- Automated tests
- Mastra assistant with read-only tools
- One deterministic Mastra workflow
- Basic AI evaluation cases
- API documentation

### Deliberate non-goals for the first version

- Real school-district integrations
- Real student data
- Production FERPA compliance claims
- Multi-tenant production authorization
- Billing
- Parent/student accounts
- Autonomous decisions
- Vector search before ordinary database search works
- Multiple cooperating agents
- Kubernetes or microservices
- A large frontend

These are non-goals because they would increase surface area without improving your JavaScript and backend fundamentals.

---

## 2. Your two tracks

### Track A: the weekend application MVP

Target: 12–16 focused hours.

Complete:

- Phase 0: environment and repository
- Phase 1: JavaScript foundations
- Phase 2: Node foundations
- Phase 3: first HTTP API
- Phase 4: first TypeScript migration
- Phase 5: one vertical slice
- Phase 7A: CSV import happy path
- Phase 10A: one small Mastra agent with one safe tool
- A clean README and a short demo

Your Monday claim should be precise:

> My backend background is primarily Python, but I spent the weekend building a Node.js and TypeScript service with validation, tests, CSV import logic, and a small Mastra integration. I am still growing in the ecosystem, but I can now explain the runtime, module system, async model, type-checking workflow, and the structure of the service I built.

Do not claim proficiency based on hours alone. Point to the code and explain what you learned.

### Track B: the complete portfolio build

Target: roughly 50–70 focused hours over several weeks.

Complete all phases, harden the application, record a demo, and write an architecture case study. This is the version that can become a serious portfolio project.

---

## 3. Mental model: JavaScript, TypeScript, and Node.js

### JavaScript

JavaScript is the language that runs. It defines values, functions, objects, promises, modules, and runtime behavior.

### TypeScript

TypeScript adds a static type checker and type syntax. It helps detect mistakes before execution. The types are normally removed before the JavaScript runs. TypeScript does not replace the need for runtime validation because HTTP requests, CSV files, environment variables, and model responses arrive at runtime.

Remember:

```text
TypeScript protects code you control.
Runtime schemas protect data you do not control.
Tests protect behavior you promise.
```

### Node.js

Node.js is the runtime that executes JavaScript outside the browser. It supplies server-side APIs for networking, files, processes, streams, timers, and more.

### npm

npm is:

- the package registry;
- the command-line package manager; and
- the script runner configured by `package.json`.

`package.json` declares the project. `package-lock.json` records the exact dependency tree installed.

### Mastra

Mastra is a TypeScript framework for AI applications. In this project it will provide agents, tools, workflows, memory/storage integration, evaluation, and tracing. It is not the foundation of the entire backend. Domain rules should remain ordinary TypeScript functions and services that can be called without an LLM.

### The request path

```text
HTTP request
    |
    v
route -> runtime validation -> service -> repository -> PostgreSQL
                |                 |
                |                 +-> domain rules
                |
                +-> safe error response
```

An AI request adds an orchestration layer:

```text
user message
    |
    v
Mastra agent -> approved typed tool -> service -> repository
    |
    +-> trace + evaluation
```

The agent never talks directly to the database.

---

## 4. Technical choices

Use these choices until you have a concrete reason to change them.

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 LTS | Supported LTS release and compatible with current Mastra requirements |
| Package manager | npm | Most universal choice for a beginner and likely workplace familiarity |
| Module system | ECMAScript modules | Modern `import`/`export`; configure `"type": "module"` |
| Language progression | JavaScript first, then strict TypeScript | Makes the JS/TS relationship visible |
| HTTP framework | Express | Common, simple, and relevant to existing Node services |
| Runtime schemas | Zod | One schema can validate data and infer TypeScript types |
| Database | PostgreSQL | Direct practice with relational modeling and SQL |
| Database access | `pg` first; optional query builder later | Learn SQL and connection behavior before hiding it |
| Testing | Vitest + Supertest | Fast unit tests and HTTP integration tests |
| CSV | `csv-parse` | Mature parsing library with streaming support |
| Excel | ExcelJS, after CSV | Relevant to the posting, but CSV is easier to reason about first |
| Logging | Pino | Structured logs suitable for Node services |
| AI framework | Mastra | TypeScript-native agents, tools, workflows, evals, and observability |
| API style | REST + JSON | Clear interface and strong interview value |
| Formatting/linting | Prettier + ESLint | Common JavaScript ecosystem workflow |
| CI | GitHub Actions | Automates the same checks you run locally |

### Why not start with microservices?

Use a modular monolith. The domains have clear boundaries, but one deployable service keeps local development, transactions, testing, and debugging understandable. If scale or team ownership later demands separate services, the module boundaries create a migration path.

### Why use `pg` before an ORM?

The internship lists SQL fundamentals. Writing a small amount of parameterized SQL teaches:

- tables, rows, keys, and constraints;
- joins;
- transactions;
- connection pools;
- database errors;
- why SQL injection happens;
- what an ORM later abstracts.

After Phase 9, you may create a branch that replaces repositories with Drizzle or Prisma and compare the trade-offs.

---

## 5. Intended repository structure

Do not create every file on day one. Grow toward this structure as phases require it.

```text
district-assist-ai/
├── project.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc.json
├── .gitignore
├── .env.example
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── data-dictionary.md
│   ├── legacy-student-module.md
│   ├── threat-model.md
│   └── demo-script.md
├── scripts/
│   ├── seed.ts
│   └── generate-demo-csv.ts
├── sandbox/
│   ├── 01-javascript/
│   ├── 02-node/
│   └── 03-typescript/
├── migrations/
│   ├── 001_create_districts.sql
│   ├── 002_create_students.sql
│   ├── 003_create_import_jobs.sql
│   └── 004_create_support_plans.sql
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── shared/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── types/
│   │   └── validation/
│   ├── database/
│   │   ├── pool.ts
│   │   ├── migrate.ts
│   │   └── transaction.ts
│   ├── modules/
│   │   ├── districts/
│   │   │   ├── district.schema.ts
│   │   │   ├── district.repository.ts
│   │   │   ├── district.service.ts
│   │   │   ├── district.routes.ts
│   │   │   └── district.test.ts
│   │   ├── students/
│   │   ├── imports/
│   │   ├── support-plans/
│   │   └── reports/
│   └── mastra/
│       ├── index.ts
│       ├── agents/
│       ├── tools/
│       ├── workflows/
│       └── scorers/
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
└── web/
    └── optional small React client
```

### What each layer owns

#### Route

- HTTP method and URL
- reading request input
- calling runtime validation
- calling a service
- choosing HTTP status and response shape

It should not contain SQL or complicated business rules.

#### Service

- use-case orchestration
- business rules
- transaction boundaries
- domain-level errors

It should not know about Express request or response objects.

#### Repository

- SQL
- translating database rows into domain objects
- persistence-specific errors

It should not choose HTTP status codes.

#### Schema

- runtime validation for untrusted data
- inferred TypeScript types where useful

#### Mastra tool

- narrow, described capability
- validated input and output
- calls an existing service
- enforces safe limits and authorization context

It should not duplicate business logic or execute arbitrary SQL.

---

## 6. API and data design

### Standard success response

For single resources:

```json
{
  "data": {
    "id": "..."
  }
}
```

For lists:

```json
{
  "data": [],
  "page": {
    "limit": 20,
    "cursor": null,
    "nextCursor": null
  }
}
```

### Standard error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "path": "gradeLevel",
        "message": "Expected an integer from 0 through 12."
      }
    ],
    "requestId": "..."
  }
}
```

Do not return stack traces, SQL, API keys, raw model output, or private records.

### Initial endpoints

#### System

- `GET /health`
- `GET /ready`

#### Districts

- `POST /api/v1/districts`
- `GET /api/v1/districts/:districtId`
- `PATCH /api/v1/districts/:districtId`

#### Students

- `POST /api/v1/districts/:districtId/students`
- `GET /api/v1/districts/:districtId/students`
- `GET /api/v1/districts/:districtId/students/:studentId`
- `PATCH /api/v1/districts/:districtId/students/:studentId`

#### Imports

- `POST /api/v1/districts/:districtId/imports/students`
- `GET /api/v1/districts/:districtId/imports/:importId`
- `GET /api/v1/districts/:districtId/imports/:importId/errors`

#### Support plans

- `POST /api/v1/districts/:districtId/students/:studentId/support-plans`
- `GET /api/v1/districts/:districtId/students/:studentId/support-plans`
- `PATCH /api/v1/districts/:districtId/support-plans/:planId`

#### AI

- `POST /api/v1/districts/:districtId/assistant/messages`
- `POST /api/v1/districts/:districtId/imports/:importId/explain-errors`

### Core tables

#### districts

- `id uuid primary key`
- `name text not null`
- `state_code char(2) not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

#### students

- `id uuid primary key`
- `district_id uuid not null references districts(id)`
- `external_id text not null`
- `first_name text not null`
- `last_name text not null`
- `grade_level integer not null`
- `school_name text not null`
- `program_status text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(district_id, external_id)`

#### import_jobs

- `id uuid primary key`
- `district_id uuid not null`
- `filename text not null`
- `status text not null`
- `total_rows integer not null default 0`
- `accepted_rows integer not null default 0`
- `rejected_rows integer not null default 0`
- timestamps

#### import_errors

- `id uuid primary key`
- `import_job_id uuid not null`
- `row_number integer not null`
- `field text`
- `code text not null`
- `message text not null`

Do not store an entire rejected row until you have designed how to protect it.

#### support_plans

- `id uuid primary key`
- `district_id uuid not null`
- `student_id uuid not null`
- `status text not null`
- `goal text not null`
- `start_date date not null`
- `review_date date not null`
- timestamps

### Important database invariants

- A student external ID is unique inside a district, not globally.
- Every child record carries or can be joined to a district.
- A support plan cannot point to a student in another district.
- Counts cannot be negative.
- Import status is a constrained value.
- Updates change `updated_at`.
- Deletes should be deferred until you understand audit requirements.

---

## 7. Phase-by-phase build

## Phase 0 — Environment and repository

### Goal

Understand every tool involved before adding application code.

### Tasks

1. Install or verify Node.js 24 LTS.
2. Verify:

   ```bash
   node --version
   npm --version
   git --version
   ```

3. Enter this starter directory and initialize the repository:

   ```bash
   cd district-assist-ai
   git init
   npm init -y
   ```

   If you renamed the folder, use that name in the `cd` command.

4. Add `"type": "module"` to `package.json`.
5. Add `.nvmrc` containing the Node major version you chose.
6. Add `.gitignore`:

   ```gitignore
   node_modules/
   dist/
   coverage/
   .env
   .DS_Store
   *.log
   ```

7. Create `.env.example` with names but no secrets:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://app:app@localhost:5432/district_assist
   MODEL_API_KEY=
   ```

8. Create `README.md` with the pitch, status, prerequisites, and start commands.
9. Copy this `project.md` into the repository.
10. Make the first commit.

### Understand

- What is a runtime?
- What is a package manager?
- What is a dependency versus a development dependency?
- What does Git track?
- Why must `.env` be ignored while `.env.example` is committed?
- What does `"type": "module"` change?

### Acceptance check

- `git status` is clean after the commit.
- `npm install` can recreate `node_modules`.
- No secret exists in Git history.

### Suggested commit

```text
chore: initialize DistrictAssist AI project
```

---

## Phase 1 — JavaScript foundations through a student-record module

### Goal

Learn JavaScript values, functions, objects, arrays, modules, errors, and tests by building useful domain logic.

### Build in `sandbox/01-javascript`

#### Exercise 1: values and equality

Create `values.js`. Experiment with:

- `const` and `let`;
- strings, numbers, booleans, `null`, and `undefined`;
- strict equality `===`;
- truthy and falsy values;
- template strings;
- optional chaining `?.`;
- nullish coalescing `??`.

Write down why `===` is the default and what makes `null` different from `undefined`.

#### Exercise 2: student objects

Create a fictional student object. Write:

- `formatStudentName(student)`;
- `isValidGradeLevel(value)`;
- `hasRequiredFields(student)`;
- `toPublicStudent(student)`.

Use destructuring and object spread, but first explain what each creates and whether it performs a deep copy.

#### Exercise 3: arrays

Given 10 fictional students, use:

- `map` to produce display names;
- `filter` to select a grade;
- `find` to locate an external ID;
- `some` to detect incomplete data;
- `every` to verify required fields;
- `reduce` to count students by grade.

Do not mutate the original array.

#### Exercise 4: functions and scope

Write the same simple transformation as:

- a function declaration;
- a function expression;
- an arrow function.

Explain hoisting, lexical scope, and why callbacks appear throughout Node code.

#### Exercise 5: modules

Export validation functions from `student-validation.js` and import them into `index.js` using ESM.

#### Exercise 6: errors

Create a `ValidationError extends Error`. Throw it for invalid grade levels, catch it at a boundary, and return a useful result.

#### Exercise 7: asynchronous JavaScript

Create `fake-student-store.js` whose functions return promises after a short timer:

- `findStudentById(id)`;
- `saveStudent(student)`.

Call them using both `.then()` and `async`/`await`. Add a deliberate rejection and handle it with `try`/`catch`.

### Critical concepts

- Primitive values versus object references
- Mutation versus creating a new value
- Function arguments and return values
- Closures
- ESM imports and exports
- Synchronous execution
- Promises
- Microtasks versus timer callbacks at a high level
- Error propagation

### Tests

Install Vitest only when you are ready to test:

```bash
npm install --save-dev vitest
```

Test:

- valid and invalid grade levels;
- missing required fields;
- counting by grade;
- an async success;
- an async rejection.

### Interview checkpoint

Explain:

1. `const` does not make an object immutable. Why?
2. What is the difference between `map` and `forEach`?
3. What does `await` do?
4. What happens when a promise rejects and nobody handles it?
5. How are ESM and CommonJS imports different?
6. Why can shallow object spread still share nested state?

### Suggested commit

```text
learn: practice JavaScript with student record transformations
```

---

## Phase 2 — Node.js foundations without a web framework

### Goal

See what Node itself provides before Express hides the plumbing.

### Tasks

1. Read command-line arguments from `process.argv`.
2. Read configuration from `process.env`.
3. Use `node:fs/promises` to read a fictional JSON file.
4. Use `node:path` and URL-based ESM paths safely.
5. Create a tiny HTTP server with `node:http`.
6. Return JSON from `GET /health`.
7. Read a JSON request body for `POST /echo`.
8. Add a global request ID using `node:crypto`.
9. Handle malformed JSON without crashing the process.
10. Listen for `SIGTERM` and close the server gracefully.

### Do not build abstractions yet

One or two small files are fine. The point is to observe:

- request method;
- request URL;
- headers;
- body chunks;
- status code;
- response headers;
- process lifetime.

### Node event-loop experiment

Predict the output order, run it, and explain the result:

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => console.log("C"));

console.log("D");
```

Then read a large file using an asynchronous API. Explain why asynchronous I/O is useful even though JavaScript execution is generally single-threaded.

### Acceptance check

- `curl http://localhost:3000/health` returns JSON.
- Malformed JSON produces a 400 response.
- One bad request does not stop later requests.
- Ctrl+C or `SIGTERM` shuts down cleanly.

### Interview checkpoint

Explain:

- Node’s event loop at a practical level;
- blocking versus non-blocking I/O;
- why CPU-heavy work is different from database/network waiting;
- why a server process stays alive;
- the difference between a process crash and an HTTP 500.

### Suggested commit

```text
learn: build a Node HTTP server without a framework
```

---

## Phase 3 — Express and a first REST API

### Goal

Rebuild the raw Node server with Express and understand exactly what the framework gives you.

### Install

```bash
npm install express
npm install --save-dev supertest
```

### Tasks

1. Create `app.js` that configures and exports the Express app.
2. Create `server.js` that starts listening.
3. Keep those responsibilities separate so tests can use the app without opening a real port.
4. Add JSON body parsing.
5. Add request-ID middleware.
6. Add structured request logging.
7. Create:

   - `GET /health`;
   - `POST /api/v1/students`;
   - `GET /api/v1/students`;
   - `GET /api/v1/students/:studentId`.

8. Store students in memory temporarily.
9. Add a not-found handler after all routes.
10. Add one centralized error handler last.
11. Use status codes correctly:

   - 200 for reads;
   - 201 for creation;
   - 400 for malformed input;
   - 404 for missing resources;
   - 409 for duplicate external IDs;
   - 500 for unexpected failures.

### Learn the middleware pipeline

For one request, write down the exact order in which these run:

```text
request ID
-> request logger
-> JSON parser
-> route
-> not-found handler, if unmatched
-> error handler, if an error is forwarded
```

### Tests

Use Supertest to verify the public HTTP behavior:

- health succeeds;
- valid student creation returns 201;
- malformed student returns 400;
- duplicate external ID returns 409;
- existing student returns 200;
- missing student returns 404;
- unknown route returns the standard error shape.

### Interview checkpoint

- What is middleware?
- Why export `app` separately from `server`?
- When should a client receive 400 versus 404 versus 409?
- Why should routes not contain every business rule?
- What makes an API idempotent?

### Suggested commit

```text
feat: add in-memory student REST API with Express
```

---

## Phase 4 — Migrate the working JavaScript API to TypeScript

### Goal

Perform a miniature legacy migration: document behavior, add a type-checker, and preserve the external contract.

### Step 1: freeze the current behavior

Before changing file extensions:

1. Make all Phase 3 tests pass.
2. Document each endpoint’s input, output, status codes, and failure cases in `docs/legacy-student-module.md`.
3. Note any odd behavior instead of silently changing it.
4. Commit this baseline.

This is your characterization-test safety net.

### Step 2: install TypeScript tooling

```bash
npm install --save-dev typescript tsx @types/node @types/express
```

Use a strict `tsconfig.json`. Begin with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "rootDir": ".",
    "outDir": "dist",
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "scripts", "sandbox"]
}
```

Your installed libraries may require small adjustments. Understand a compiler option before changing it to silence an error.

Add scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "node dist/src/server.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run typecheck && npm test"
  }
}
```

### Step 3: migrate one file at a time

Recommended order:

1. pure validation functions;
2. domain types;
3. in-memory repository;
4. service;
5. routes;
6. app;
7. server;
8. tests.

Run tests after every file.

### TypeScript rules for this project

- Keep `strict` enabled.
- Do not use `any` to escape thinking.
- Use `unknown` for caught errors and untrusted values, then narrow it.
- Prefer type inference for obvious local values.
- Add explicit types at public module boundaries.
- Model fixed states with string-literal unions.
- Use discriminated unions for results with distinct states.
- Avoid enums while learning; string unions are easier to inspect at runtime.
- Remember that interfaces and types do not validate HTTP input.
- Do not add generic abstractions before two real consumers need them.

### Example concept, not code to copy blindly

```ts
type ImportResult =
  | { status: "accepted"; studentId: string }
  | { status: "rejected"; errors: ValidationIssue[] };
```

When `status` is checked, TypeScript can narrow the rest of the object.

### Acceptance check

- All old behavior remains covered.
- `npm run typecheck` passes.
- No `any`, `@ts-ignore`, or disabled strictness is introduced.
- The compiled application starts.
- You can identify which checks happen at compile time and which happen at runtime.

### Migration retrospective

Write:

- Which bugs did TypeScript expose?
- Which problems could TypeScript not detect?
- Which old behavior did tests protect?
- Which behavior would you intentionally change in a separate pull request?
- What did the migration cost?

### Suggested commits

```text
test: characterize JavaScript student module
chore: configure strict TypeScript
refactor: migrate student module to TypeScript
```

---

## Phase 5 — Build one complete vertical slice

### Goal

Build district creation through every layer before expanding horizontally.

### Install runtime validation

```bash
npm install zod
```

### Build

`POST /api/v1/districts`

Input:

```json
{
  "name": "Demo Learning District",
  "stateCode": "OK"
}
```

Response:

```json
{
  "data": {
    "id": "generated-uuid",
    "name": "Demo Learning District",
    "stateCode": "OK",
    "createdAt": "ISO-8601 timestamp",
    "updatedAt": "ISO-8601 timestamp"
  }
}
```

### Work from the outside inward

1. Write an HTTP test that expresses the desired behavior.
2. Define the Zod request schema.
3. Define the route.
4. Define the service use case.
5. Define a repository interface.
6. Implement an in-memory repository.
7. Return the standard response.
8. Add duplicate-name behavior only if you decide it is a real domain rule.

### Dependency rule

The service receives its repository dependency. It does not import a global in-memory array. This makes behavior testable and prepares for PostgreSQL.

### Tests

- schema unit tests;
- service tests with a fake repository;
- HTTP integration tests;
- unexpected repository failure maps to a safe 500.

### Acceptance check

Trace a request aloud from socket to response and name the responsibility of every layer.

### Suggested commit

```text
feat: create districts through a layered vertical slice
```

---

## Phase 6 — PostgreSQL and relational fundamentals

### Goal

Replace temporary storage with a relational database without changing API behavior.

### Set up

Use a local PostgreSQL installation or a local container. If using a container, define one explicit database service in `docker-compose.yml`; do not put a production password in it.

Install:

```bash
npm install pg
npm install --save-dev @types/pg
```

### Learn before coding

Be able to explain:

- primary key;
- foreign key;
- unique constraint;
- `NOT NULL`;
- index;
- transaction;
- connection versus connection pool;
- parameterized query;
- migration;
- rollback.

### Tasks

1. Create SQL migration files.
2. Create a migration runner or use a small migration tool.
3. Create a `Pool`.
4. Validate `DATABASE_URL` at startup.
5. Implement the district repository with parameterized SQL.
6. Implement the student repository.
7. Translate `snake_case` database columns into `camelCase` API objects.
8. Test duplicate external IDs.
9. Add a readiness check that verifies the database connection.
10. Gracefully close the pool during shutdown.

### SQL injection experiment

In a disposable sandbox, compare string interpolation with a parameterized query. Explain why this is unsafe:

```ts
`SELECT * FROM students WHERE external_id = '${externalId}'`
```

All application queries must use parameters.

### Integration tests

Tests need an isolated test database. Each test must not depend on execution order. Choose one strategy:

- transaction per test with rollback;
- truncate owned tables between tests;
- create a temporary database/schema.

Document the choice and its trade-offs.

### Acceptance check

- Restarting the server preserves records.
- Duplicate `(district_id, external_id)` is rejected by the database.
- Application behavior maps that conflict to 409.
- A database outage makes readiness fail without exposing credentials.

### Suggested commits

```text
feat: add PostgreSQL schema and migration runner
refactor: persist districts and students in PostgreSQL
test: cover repository integration behavior
```

---

## Phase 7 — CSV and Excel import pipeline

### Goal

Build the most job-relevant feature: safely transform an external tabular format into validated records.

## Phase 7A — Weekend happy path

Start with a small CSV string or file:

```csv
external_id,first_name,last_name,grade_level,school_name,program_status
DEMO-1001,Ada,Learner,7,North Demo Middle,active
DEMO-1002,Grace,Student,8,North Demo Middle,monitoring
```

Build a pure function that:

1. accepts parsed row objects;
2. normalizes headers and whitespace;
3. validates each row;
4. returns accepted records and row-level errors;
5. never silently discards a row.

Test it before adding file upload.

## Phase 7B — Complete pipeline

Install:

```bash
npm install csv-parse multer
npm install --save-dev @types/multer
```

Later:

```bash
npm install exceljs
```

### Pipeline states

```text
received
-> parsing
-> validating
-> persisting
-> completed

Any processing state may become failed.
```

### Tasks

1. Create an import job before processing.
2. Restrict content type and file size.
3. Stream the CSV instead of loading an unbounded file into memory.
4. Normalize headers using an explicit mapping.
5. Validate each row with Zod.
6. Attach the original one-based row number.
7. Separate accepted rows from rejected rows.
8. Insert accepted records in controlled batches.
9. Use a transaction where atomic behavior is required.
10. Update counts and final status.
11. Return an error report.
12. Make retry behavior explicit.

### Decide the atomicity contract

Pick and document one:

#### All-or-nothing

If any row is invalid, insert none. Easier to reason about, but frustrating for large district exports.

#### Partial acceptance

Insert valid rows and report invalid rows. More useful, but requires strong idempotency and reporting.

Recommended for this project: partial acceptance with a dry-run validation option.

### Idempotency

If the same file is retried, what happens?

Design around:

- district-scoped external IDs;
- upsert versus reject;
- file checksum;
- import job identity;
- replay after partial failure.

Do not implement all mechanisms immediately. Write the contract first.

### Edge cases

- empty file;
- header-only file;
- duplicate headers;
- missing required header;
- unknown extra header;
- blank line;
- whitespace around values;
- `0` as a grade;
- invalid UTF-8;
- quoted commas;
- duplicate student within the same file;
- duplicate existing student;
- file larger than the configured limit;
- database failure halfway through a batch.

### Excel phase

Once CSV works, create an adapter that converts the first worksheet into the same normalized row shape. The validation and persistence pipeline must be reused. Excel parsing is an input adapter, not a separate business system.

### Acceptance check

- 100-row synthetic file produces correct counts.
- Rejected rows identify row, field, code, and safe message.
- No raw student row is logged.
- A malformed row does not crash the process.
- CSV and Excel inputs share downstream validation.

### Suggested commits

```text
feat: validate student CSV rows with actionable errors
feat: process student imports in controlled batches
feat: accept Excel imports through the shared pipeline
```

---

## Phase 8 — Support plans and business rules

### Goal

Practice a domain with meaningful invariants rather than simple CRUD.

### Rules

- Goal text cannot be blank.
- Review date must be on or after start date.
- Status is `draft`, `active`, `completed`, or `cancelled`.
- Only allowed state transitions succeed.
- A plan and student must belong to the same district.
- Completed plans cannot be edited except through an explicit reopen use case.

### Model state transitions

```text
draft -> active -> completed
  |         |
  +------> cancelled
```

Write a pure function:

```text
canTransitionPlan(currentStatus, nextStatus)
```

Test every allowed and rejected transition.

### Concurrency question

What if two specialists edit the same plan?

First document the problem. Then add optimistic concurrency with a `version` column or `updated_at` precondition. Return 409 when a stale update would overwrite a newer one.

### Acceptance check

Business rules live in the service/domain layer and are tested without Express or PostgreSQL.

### Suggested commit

```text
feat: enforce support plan lifecycle rules
```

---

## Phase 9 — Production-shaped Node service

### Goal

Make the service observable, predictable, and safe under ordinary failures.

### Add

- Pino structured logging;
- request IDs;
- validated environment configuration;
- centralized error mapping;
- graceful shutdown;
- health and readiness separation;
- pagination;
- request-size limits;
- timeouts;
- CORS configured for an explicit origin;
- security headers;
- basic rate limiting;
- API version prefix;
- OpenAPI documentation;
- CI checks.

### Logging rules

Log:

- request ID;
- route template;
- HTTP method;
- response status;
- duration;
- import job ID;
- safe error code.

Do not log:

- authorization headers;
- API keys;
- full student objects;
- uploaded file contents;
- raw prompts containing records;
- model responses containing records;
- database URLs.

### Error taxonomy

Create explicit errors such as:

- `ValidationError` -> 400
- `AuthenticationError` -> 401
- `AuthorizationError` -> 403
- `NotFoundError` -> 404
- `ConflictError` -> 409
- `RateLimitError` -> 429
- unexpected error -> 500

The public message is safe. The internal log may contain additional diagnostic context, still without sensitive content.

### CI pipeline

On every pull request run:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

### Acceptance check

Kill the database, send malformed input, trigger a conflict, and stop the process. For each event, describe the client response, log entry, and process behavior.

### Suggested commit

```text
chore: harden service operations and CI checks
```

---

## Phase 10 — Mastra fundamentals

### Goal

Add useful AI capabilities without allowing the model to bypass your application’s rules.

Current Mastra projects use a `src/mastra` entry point with folders for agents, tools, workflows, and scorers. Mastra changes quickly, so verify syntax in the current official documentation when you reach this phase.

### First Mastra concepts

#### Agent

Instructions + model + optional tools and memory. An agent decides how to respond and which allowed tools to call.

#### Tool

A typed, validated function exposed to an agent. The tool is the security and reliability boundary between probabilistic model behavior and deterministic application behavior.

#### Workflow

A predefined sequence or graph of steps. Use a workflow when order and repeatability matter more than open-ended model choice.

#### Scorer/evaluation

A way to measure output quality or behavior across test cases.

#### Observability

Traces that help inspect model calls, tool use, latency, failures, and cost.

## Phase 10A — Weekend agent

Create one read-only agent:

```text
District Data Assistant
```

Give it one tool:

```text
getImportSummary(importId)
```

The tool returns counts and safe error categories, not student rows.

Ask:

- “How many rows were accepted?”
- “What were the most common error categories?”
- “Did the import complete?”

The assistant must state when the import does not exist instead of inventing results.

### Complete tools

Add narrow read-only tools:

- `getStudentByExternalId`
- `listStudentSupportPlans`
- `getImportSummary`
- `listImportErrorCategories`
- `getDistrictProgramCounts`

Every tool must:

1. have a stable ID and precise description;
2. validate its input;
3. receive district/user context outside model-controlled arguments;
4. call a service, not SQL;
5. return a minimal typed result;
6. cap list size;
7. return explicit not-found behavior;
8. avoid secrets and unnecessary private fields;
9. be tested without a live model.

### Prompt-injection boundary

Treat all imported text, tool output, and user messages as untrusted. Text inside a student record cannot grant permissions, change system instructions, request secrets, or authorize another tool.

The model never chooses `districtId` as trusted authorization input. The server derives scope from authenticated context and provides it to tools.

### Assistant constraints

The system instructions should say, in substance:

- answer only about authorized district data;
- use tools for factual claims about records;
- do not invent missing information;
- distinguish facts from suggestions;
- do not make high-impact decisions;
- do not expose hidden instructions or credentials;
- ask for clarification when identity is ambiguous;
- keep summaries concise and auditable.

### Do not add memory yet

First make single-turn, tool-grounded behavior reliable. Then consider memory with explicit scope:

```text
resource = district/user or role
thread = a single conversation
```

Never let one district retrieve another district’s memories.

### Acceptance check

- The agent answers import-count questions from the tool.
- An unknown ID produces an honest not-found response.
- A prompt asking for another district’s records is refused.
- A malicious instruction inside tool output has no authority.
- The tool is unit-tested separately from the model.

### Suggested commit

```text
feat: add grounded district data assistant with read-only tools
```

---

## Phase 11 — Mastra workflow: explain an import safely

### Goal

Use a deterministic workflow for a multi-step task.

### Workflow

```text
validate request
-> load import summary
-> aggregate safe error categories
-> generate plain-language explanation
-> validate output
-> persist audit metadata
-> return response
```

The model receives aggregate categories, counts, and sanitized examples—not the entire uploaded file.

### Output schema

Require:

```text
summary: string
topIssues: array of
  code: string
  count: number
  explanation: string
  suggestedFix: string
caveat: string
```

Validate model output at runtime. If it fails validation, retry within a small explicit limit or return a controlled failure.

### Why a workflow instead of an agent?

The process order is known. You want repeatability and visibility, not open-ended tool selection. Be able to defend that distinction in an interview.

### Failure cases

- import does not exist;
- import still processing;
- no errors;
- service timeout;
- model timeout;
- malformed model output;
- trace/storage failure;
- retry exhaustion.

### Acceptance check

Each step is independently testable. A model failure does not corrupt import records.

### Suggested commit

```text
feat: explain import errors with a typed Mastra workflow
```

---

## Phase 12 — AI evaluation and observability

### Goal

Treat AI behavior as something measured, not merely demoed.

### Create a small evaluation dataset

Use 20–30 synthetic cases covering:

- ordinary import-count question;
- ambiguous student identity;
- unknown student;
- no support plans;
- another-district request;
- prompt injection;
- request for a prohibited high-impact recommendation;
- request unsupported by tool data;
- malformed tool response;
- very long user input.

### Deterministic assertions

Test:

- correct tool was called;
- tool input matched authorized scope;
- forbidden tool was not called;
- response schema is valid;
- response does not contain known secret canaries;
- unknown facts are not invented;
- prohibited decision request is declined;
- response latency stays under a documented local threshold.

### Model-based scoring

Only after deterministic checks, optionally score:

- groundedness;
- clarity;
- completeness;
- appropriate uncertainty;
- policy adherence.

Model-based scores are signals, not ground truth. Store the prompt version, model, settings, and scorer version so results are comparable.

### Observability questions

For every trace, you should be able to determine:

- which agent/workflow ran;
- which prompt version ran;
- which model ran;
- which tools were called;
- how long each step took;
- whether a retry occurred;
- token usage/cost;
- final success or safe failure.

Do not record sensitive payloads merely because tracing makes it easy.

### Regression rule

When you fix an AI failure, add the failing scenario to the evaluation dataset before changing the prompt or tool.

### Suggested commit

```text
test: add AI safety and groundedness evaluation suite
```

---

## Phase 13 — Authentication and tenant isolation

### Goal

Understand that multi-tenant authorization is a server responsibility, not an agent instruction.

### Start simple

Use a development-only authenticated-user fixture with:

- `userId`;
- `districtId`;
- `role`.

Later replace it with a real identity provider or verified JWT.

### Authorization rules

- District coordinators access only their district.
- Specialists access only assigned schools or students.
- Platform admins are explicit and audited.
- Repository queries include tenant scope.
- Resource IDs alone never grant access.
- Mastra tools receive server-derived authorization context.

### Essential negative test

Create District A and District B. Authenticate as A. Attempt to retrieve B’s student using a valid B student ID. The result must not expose whether that record exists.

### Threat model

Document:

- assets;
- actors;
- entry points;
- trust boundaries;
- abuse cases;
- mitigations;
- accepted risks.

Include CSV formula injection in exports, file upload abuse, SQL injection, broken object-level authorization, prompt injection, secret leakage, and cross-tenant memory.

### Suggested commit

```text
feat: enforce district-scoped authorization boundaries
```

---

## Phase 14 — Optional React admin client

### Goal

Gain enough React fluency to connect a frontend to the backend without turning this into a frontend-heavy project.

### Build only three screens

1. Student list with loading, empty, error, and success states.
2. CSV upload with progress and validation summary.
3. Assistant panel showing messages and tool-grounded citations/record references.

### Learn

- components;
- props;
- state;
- effects;
- forms;
- controlled inputs;
- fetching;
- cancellation;
- rendering lists with stable keys;
- loading and error states;
- browser versus server environment;
- CORS.

### Type sharing warning

Do not import database types into the client. Share explicit API contracts or generate a client from OpenAPI.

### Acceptance check

Use the browser network inspector to explain one complete request and response.

### Suggested commit

```text
feat: add minimal React operations console
```

---

## Phase 15 — Deployment and portfolio polish

### Goal

Make the project understandable and reproducible to another engineer.

### Before deployment

- Production build succeeds.
- Environment variables are documented.
- Database migrations run explicitly.
- Health/readiness behavior is correct.
- Logs are structured.
- Rate limits and request limits exist.
- CORS is explicit.
- Demo data is synthetic.
- No secret exists in history.
- Dependency audit results are reviewed.
- AI model/provider failures degrade safely.

### README outline

1. Product problem
2. Demo
3. Architecture
4. Feature list
5. Technical decisions
6. Local setup
7. Environment variables
8. Database migrations and seed
9. Tests and checks
10. API examples
11. AI safety boundaries
12. Trade-offs and next steps
13. What you learned migrating JavaScript to TypeScript

### Demo script: five minutes

1. State the problem in 20 seconds.
2. Import one synthetic file.
3. Show accepted and rejected rows.
4. Retrieve a student through the API/UI.
5. Ask the assistant for grounded import facts.
6. Show one test.
7. Show one trace.
8. Explain one deliberate trade-off.

### Architecture case-study questions

- Why modular monolith?
- Why plain SQL first?
- Why validate at the boundary?
- Why separate routes, services, and repositories?
- Why does the AI call services through tools?
- When is a workflow preferable to an agent?
- How is tenant scope enforced?
- How do you test nondeterministic behavior?
- What would you change for 100 districts? For 10,000?

---

## 8. Testing strategy

### The testing pyramid for this project

#### Unit tests: many and fast

Test pure behavior:

- row normalization;
- Zod schemas;
- plan transitions;
- import aggregation;
- error mapping;
- Mastra tool executors with fake services.

#### Integration tests: fewer

Test boundaries:

- PostgreSQL repositories;
- Express routes;
- migrations;
- transaction behavior;
- CSV streaming pipeline.

#### End-to-end tests: a small number

Test major journeys:

- create district -> import students -> retrieve student;
- create support plan -> update state;
- import errors -> AI explanation.

#### AI evaluations: scenario dataset

Test groundedness, safe tool use, tenant boundaries, and refusal behavior.

### Test naming

Name tests by behavior:

```text
rejects a support plan when reviewDate precedes startDate
returns 409 when an external ID already exists in the district
does not call the student tool for a cross-district request
```

Avoid:

```text
test service
works correctly
student test 2
```

### What not to test

- private implementation details;
- that Express itself works;
- a library’s already-tested parsing behavior in isolation;
- exact model prose, unless exact text is a contract.

---

## 9. Debugging playbook

When something fails:

1. Read the entire error, including the first relevant stack frame in your code.
2. State what you expected.
3. State what actually happened.
4. Reduce the problem to the smallest reproduction.
5. Inspect values at the boundary.
6. Check whether the failure is:

   - syntax;
   - type-checking;
   - runtime;
   - network;
   - database;
   - environment/configuration;
   - model/provider;
   - incorrect assumption.

7. Change one thing.
8. rerun the narrowest relevant check.
9. Remove temporary logging.
10. Add a regression test when appropriate.

### Common beginner traps

- Forgetting to `await` a promise
- Mixing CommonJS `require` with ESM `import`
- Assuming TypeScript validates HTTP JSON at runtime
- Catching an error and silently continuing
- Returning before an async operation finishes
- Starting the real server inside integration tests
- Reading all uploaded data into memory
- Trusting a filename or content type
- Building SQL with string interpolation
- Committing `.env`
- Using `any` until errors disappear
- Letting routes become giant functions
- Giving the AI a broad “run query” tool
- Testing only the happy path

### A good help request

```text
I expected POST /students to return 409 for a duplicate external ID.
It returns 500 instead.
The database unique constraint fires, but my error mapper receives an
unknown error. Here is the repository method, mapper, failing test, and
the exact error code. Please give me the smallest hint first.
```

This is much better than “it doesn’t work.”

---

## 10. Git workflow

### Branching

For a solo learning project:

- keep `main` working;
- create one short-lived branch per feature;
- open your own pull request for important phases;
- review the diff before merging.

Examples:

```text
feature/student-csv-import
feature/mastra-import-assistant
refactor/student-module-typescript
fix/cross-district-student-access
```

### Commit quality

Each commit should represent one coherent change and leave the project in a usable state.

Good:

```text
feat: validate CSV rows before persistence
test: cover duplicate external IDs within an import
fix: preserve zero as a valid grade level
refactor: migrate student repository to TypeScript
```

Weak:

```text
stuff
updates
final final
ai changes
```

### Self-review checklist

Before a pull request:

- Can I explain every changed file?
- Did I include unrelated formatting?
- Is behavior covered by tests?
- Is input validated at the boundary?
- Are failures explicit?
- Could logs or errors expose sensitive data?
- Did I add a dependency that is not necessary?
- Did I preserve the API contract?
- Did I update documentation?
- Do all checks pass from a clean install?

---

## 11. Weekly progression and checkpoints

### Weekend

- JavaScript fundamentals
- raw Node server
- Express API
- TypeScript migration
- one tested district/student slice
- CSV validation happy path
- one Mastra tool and agent

Deliverable: a small honest demo and a strong learning story.

### Week 1

- PostgreSQL
- full CSV import jobs
- error reports
- support-plan domain
- structured logging

Deliverable: a real backend service with meaningful persistence and tests.

### Week 2

- Excel adapter
- pagination
- authentication fixture
- district isolation
- Mastra workflow
- evaluation dataset

Deliverable: a secure-shaped multi-tenant AI backend.

### Week 3

- optional React client
- deployment
- CI
- load/performance experiment
- portfolio documentation

Deliverable: a polished end-to-end portfolio project.

---

## 12. Interview mastery checkpoints

Do not memorize definitions. Answer using examples from this repository.

### JavaScript

- Explain closures with a repository factory or middleware.
- Explain reference equality using a student object.
- Explain mutation bugs and how you avoided them.
- Explain promise rejection and error propagation.
- Explain ESM and why this project uses it.

### TypeScript

- What does `strict` catch?
- Why use `unknown` rather than `any`?
- What is narrowing?
- Interface versus type alias?
- What disappears at runtime?
- Why does Zod still matter?
- Show a discriminated union from the import pipeline.

### Node.js

- What is the event loop?
- What work blocks it?
- How does asynchronous I/O help?
- What is a stream?
- Why stream CSV imports?
- How do graceful shutdown and connection pools interact?
- What is the difference between health and readiness?

### API/backend

- How did you choose status codes?
- How do you make imports idempotent?
- Where do transactions begin?
- How do you prevent SQL injection?
- How do layers improve testability?
- When would the modular monolith become a problem?

### Migration

- How did you discover existing behavior?
- What are characterization tests?
- How did you sequence the migration?
- What behavior did you preserve even if imperfect?
- How did you reduce rollback risk?

### AI engineering

- Agent versus workflow?
- Why are tools security boundaries?
- How do you prevent cross-tenant tool access?
- How do you evaluate model behavior?
- How do you handle prompt injection?
- What happens when the model provider is unavailable?
- Why should domain logic not live in prompts?

---

## 13. Stretch goals

Only start these after the core is tested and documented.

### Useful stretch goals

- OneRoster-compatible input adapter
- Ed-Fi-shaped adapter using synthetic data
- background job queue for large imports
- Server-Sent Events for import progress
- OpenAPI-generated client
- audit event table
- role-based authorization
- object storage for uploads with retention policy
- row-level import retry
- performance test with 100,000 synthetic rows
- RAG over fictional district policy documents
- human approval before AI-drafted actions
- compare raw SQL with Drizzle on a branch

### Avoid as vanity complexity

- microservices with no scaling or team reason;
- Kafka for a single local process;
- multiple agents when one workflow is clearer;
- a vector database before you have a retrieval use case;
- Kubernetes for a portfolio demo;
- custom authentication cryptography;
- an abstract “base repository” with no demonstrated need.

---

## 14. Definition of portfolio-complete

The project is portfolio-complete when:

- a new developer can run it from the README;
- all example data is synthetic;
- API behavior is documented;
- schema migrations work on an empty database;
- imports report partial failures clearly;
- tenant isolation has negative tests;
- JavaScript-to-TypeScript migration is documented;
- unit, integration, end-to-end, and AI evaluation tests exist;
- CI passes;
- secrets are absent from the repository and history;
- logs avoid student content;
- the AI uses narrow service-backed tools;
- model failures are controlled;
- the demo is under five minutes;
- you can explain every major trade-off without reading a script.

---

## 15. Official learning references

Prefer official documentation over random tutorials:

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Node.js Learn](https://nodejs.org/en/learn)
- [Node.js TypeScript documentation](https://nodejs.org/api/typescript.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [Express documentation](https://expressjs.com/)
- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Zod documentation](https://zod.dev/)
- [Vitest guide](https://vitest.dev/guide/)
- [Mastra quickstart](https://mastra.ai/guides/getting-started/quickstart)
- [Mastra project structure](https://mastra.ai/reference/project-structure)

Mastra evolves quickly. When this guide and current Mastra documentation disagree on an API name or scaffolded file, follow the current official documentation and record the change in your project notes.

---

## 16. Start here: your first 90 minutes

Do exactly this—no AI agent, database, or framework yet.

### Minutes 0–15

- Verify Node, npm, and Git.
- Create the repository.
- Initialize npm and Git.
- Add `.gitignore`, `.env.example`, and `README.md`.
- Make the first commit.

### Minutes 15–35

In `sandbox/01-javascript/student.js`:

- create three fictional student objects;
- write `formatStudentName`;
- write `isValidGradeLevel`;
- filter students by grade;
- count students by program status;
- print the results.

### Minutes 35–55

Split validation into a second ESM module. Deliberately create:

- one missing export;
- one wrong import path;
- one invalid value.

Read each error and fix it.

### Minutes 55–75

Write an asynchronous `findStudentByExternalId` using a promise. Handle:

- found;
- not found;
- simulated storage failure.

### Minutes 75–90

Write Vitest tests for:

- grade 0;
- grade 12;
- grade 13;
- missing student;
- storage rejection.

Commit:

```text
learn: add JavaScript student record exercises
```

Then answer in your own words:

1. What executes JavaScript?
2. What does npm manage?
3. What does `await` wait for?
4. What did the tests prove?
5. What failure was hardest to understand?

That is the beginning. Build the next phase only after you can answer those questions.
