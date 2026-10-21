# 04 — Isolation Tests, Audit & Definition of Done

Tenant isolation is the point of this conversion. This file defines how to prove it.

## 1. Cross-tenant e2e suite (`test/tenant-isolation.e2e-spec.ts`, jest + supertest)

**Safety:** Neo4j Community has a single database, so the suite runs against the dev/test instance. It must only create and clean up data belonging to its own two test tenants (`test-a`, `test-b`, identified by their generated IDs). Never run it against production.

### 1.1 Fixture (create in `beforeAll`, delete only these tenants' data in `afterAll`)

Tenants **A** and **B**. In each tenant:
- 1 `admin`, 2 `alumni`, 2 `student`, 1 `partner` (all `approved`), plus 1 `pending` student.
- Give users in A and B **identical display names** and a **shared skill** (e.g. `"TypeScript"`) so leaks via shared nodes or search show up.
- 1 opportunity (requiring the shared skill), 1 event, 1 announcement, 1 conversation with a message, 1 notification, 1 connection, 1 follow, work experience + education on one alumni.
- 1 `super_admin`.

Log in as each user to obtain real JWTs.

### 1.2 Assertions (using **A's** tokens against **B's** IDs/data)

Every row must hold in **both directions** (A→B and B→A).

| Area | Request (as tenant A user) | Expected |
| :--- | :--- | :--- |
| Profile | `GET /api/profiles/user/{B user id}` | `404` |
| Username lookup | `GET /api/search/user/{B username}` | `404` |
| Search | `GET /api/search/users?display_name=<shared name>` | only A users |
| Search | `GET /api/search/suggestions?q=<shared prefix>` | only A users |
| Search | `GET /api/search/opportunities?skill=TypeScript` | only A opportunities |
| Suggestions | `GET /api/profiles/suggestions` | only A users (even though skill is shared) |
| Opportunities | `GET /api/opportunities` | only A |
| Opportunities | `GET/PUT/DELETE /api/opportunities/{B id}` | `404` |
| Events | get/edit/delete `{B event id}` | `404` |
| Connections | `POST /api/connections/request/{B user}` | `404` |
| Connections | `POST /block|follow/{B user}` | `404` |
| Connections | `GET /api/connections/{B user}/followers` | `404` |
| Chat | start conversation with `{B user}` | `404` |
| Chat | read/send/edit/delete in `{B conversation}` | `404` |
| Notifications | list / mark-read `{B notification}` | only A / `404` |
| Network | `GET /api/network/shortest-path?from={A}&to={B}` | `404` (or empty path), never a path |
| Network | centrality / top-companies / skill-trends / batch-analysis | only A data (compare against fixture counts) |
| Admin (A admin) | pending-accounts | only A's pending student |
| Admin | `PATCH approve-account/{B pending id}` | `404`, B's account unchanged |
| Admin | `PATCH bulk/approve` with `[A pending, B pending]` | A succeeded, B **failed**, B unchanged |
| Admin | `DELETE remove-account/{B user}`, `PATCH restore-account/{B user}` | `404`, unchanged |
| Admin | `GET all-alumni|all-students|all-partners` | only A |
| Admin | `GET dashboard-stats`, `advanced-analytics` | numbers equal A's fixture counts |
| Admin | `GET export/alumni` (CSV) | only A rows |
| Admin | `GET/DELETE announcements/{B id}` | `404` |
| Admin | `DELETE opportunities|events/{B id}` | `404` |
| Admin | `POST announcements` | response count == A's approved user count; B users receive **no** notification (check DB) |
| Roles | `super_admin` token → any `/api/admin/*` and `/api/opportunities` | `403` (or tenant-context error), never data |
| Roles | A admin token → `/api/super-admin/*` | `403` |
| Token | token without `tenantId` (non-super-admin) | `401` |
| Suspension | super admin suspends A → A user request | `403` (allow for cache TTL; in tests call cache invalidate or use TTL=0); login also `403`; B unaffected; reactivate restores |
| Register | `tenant_id` of suspended/nonexistent tenant | `400` |
| Register | domain restricted tenant + wrong domain (student) | `400`; partner exempt |
| Enumeration | compare response **body and status** for "B id" vs "random nonexistent id" | identical |

### 1.3 Realtime tests

- Connect socket clients for A user, B user. Trigger: a message in A, a presence change in A, an announcement in A. Assert B's socket receives **nothing**.
- Handshake with token lacking `tenantId` (non-super-admin) is rejected.

### 1.4 Fail-closed unit tests

- Mongoose: running a query on a tenant-owned model with **no CLS tenant** throws; with `skipTenantScope` it does not.
- Mongoose: `Model.create()` without explicit `tenantId` inside a CLS context stamps the CLS tenant; outside a context throws.
- Neo4j wrapper: Cypher containing `:User` without `$tenantId` throws; with `skipTenantScope` it runs.

### 1.5 Regression (UET tenant)

After migration, log in as an existing UET user: profile, connections, chats, opportunities, search all behave as before (counts equal pre-migration counts).

---

## 2. Grep audit (must be clean, record results in `AUDIT.md`)

Run each and justify every remaining hit:

```bash
# Neo4j: no direct driver/session use outside the wrapper and migration script
grep -rn "session.run\|\.beginTransaction\|driver.session" src | grep -v "tenant-neo4j\|neo4j.service\|migrate-multitenant"

# Cypher strings that mention a tenant-owned label but not $tenantId (heuristic; review manually)
grep -rnE ":(User|Opportunity|Event|WorkExperience|Education)\b" src | grep -v "tenantId"

# Mongo opt-outs: every skipTenantScope must be in an approved place
grep -rn "skipTenantScope" src          # allowed: login lookup, register pre-checks, tenants module, super-admin module, migration, auth pre-auth flows

# Mongo raw access that bypasses plugins
grep -rn "\.collection\.\|\.db\.collection\|bulkWrite\|\.lean()\.aggregate" src

# Global realtime emits
grep -rn "server\.emit\|\.emit(" src | grep -v "\.to(\|\.in("

# tenantId accepted from clients (must be none, except tenant_id on register)
grep -rn "tenantId" src --include="*dto*.ts"
grep -rn "tenant_id" src                # allowed: register DTO, tenants/super-admin DTOs
```

---

## 3. Manual checklist for the shared-node bridge

For each of these, open the Cypher and confirm the **far-end** `User`/`Opportunity` node has `tenantId: $tenantId`:

- [ ] user suggestions (shared skills / degree / batch / company)
- [ ] skill-trends / skill-gap analysis
- [ ] departmental skill mapping, curriculum alignment score
- [ ] top companies, batch analysis
- [ ] mentorship density / interaction density
- [ ] mutual connections, shortest path
- [ ] opportunity ↔ user skill matching
- [ ] search by `skill`, `company`

---

## 4. Definition of done

- [ ] `npm run build` and the existing test suite pass.
- [ ] Cross-tenant e2e suite (§1) passes in both directions, including realtime.
- [ ] Fail-closed unit tests (§1.4) pass.
- [ ] Grep audit (§2) clean or every hit justified in `AUDIT.md`.
- [ ] Shared-node checklist (§3) fully ticked.
- [ ] Migration ran on a **copy of real data**; verification pass shows zero tenant-owned records without `tenantId`; running it twice changes nothing.
- [ ] Existing UET tenant works as before (§1.5).
- [ ] Super admin can create a second tenant + admin, that admin can approve its own users, and tenant 2 sees none of UET's data.
- [ ] `complete_api_handbook.md` and `architectural_schema.md` updated.
- [ ] `docs/multitenancy/AUDIT.md` contains: inventories, "Decisions made", "Noticed, not changed" (include the hard-delete vs soft-delete inconsistency, and any others found).
