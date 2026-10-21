# 01 — Design Decisions

## 1. Tenancy model: pooled, `tenantId` on every tenant-owned record

- One deployment, one MongoDB database, one Neo4j database.
- `tenantId` is a **string UUID v4**, the same value in Mongo and Neo4j (Neo4j Community cannot do multi-database, and ops cost of N databases is not worth it for a prototype).
- A **tenant = one university organization** (one tenant admin group, its own alumni/students/partners).
- The server derives the tenant from the **JWT only**. **Never** accept `tenantId` from a request body, query, or header (the only exception is `tenant_id` on the public *register* endpoint, where it identifies which university the new account is applying to; see 03).

## 2. Identity & uniqueness (kept simple)

- `email` and `username` remain **globally unique** (existing Neo4j uniqueness constraints and Mongo unique indexes stay unchanged — no constraint migration).
- Consequence (accepted): the same email cannot be registered at two universities.
- Login request stays `{ email, password }`. The user's record already knows its tenant.

## 3. Roles

| Role | Scope | Notes |
| :--- | :--- | :--- |
| `super_admin` | Platform (no tenant) | **New.** Exists only in Mongo `UserAuth` (no Neo4j `User` node, no profile). `tenantId = null`. Can only use `/api/super-admin/*` routes. |
| `admin` | One tenant | **Existing role, unchanged name.** Now means "university admin". Must have a `tenantId`. |
| `alumni`, `student`, `partner` | One tenant | Unchanged; now tenant-scoped. |

`super_admin` must **not** pass the `admin` guard and must not be able to hit tenant-scoped endpoints (it has no tenant context; the fail-closed data layer will throw if it tries).

## 4. Data model changes

### 4.1 New Mongo collection: `tenants`

```ts
{
  id: string;                 // uuid v4, unique  <- this is the tenantId everywhere
  slug: string;               // unique, lowercase, url-safe, e.g. "uet-faisalabad"
  name: string;               // "UET Lahore (Faisalabad Campus)"
  status: 'active' | 'suspended';   // default 'active'
  allowed_email_domains: string[];  // optional; e.g. ["uet.edu.pk"]; empty = no restriction
  logo_url?: string;
  contact_email?: string;
  suspended_reason?: string;
  createdAt: Date; updatedAt: Date;   // timestamps
}
```

No plan, limits, billing, or config-engine fields.

### 4.2 MongoDB — add `tenantId` (string, indexed)

| Collection | Change |
| :--- | :--- |
| `UserAuth` | `tenantId` (null only for `super_admin`). Plain index on `tenantId`. Add `super_admin` to the role enum. |
| Chat: `Conversation`, `Message` | `tenantId` required. Both participants must be in the same tenant. |
| `Notification` | `tenantId` required. |
| `Activity` | `tenantId` required. |
| `Announcement` | `tenantId` required. |
| OTP / login-attempt / verified-token collections | **No `tenantId`** (keyed by email; pre-auth, tenant unknown). |
| `Tenant` | n/a (it is the tenant). |

Keep every existing index; add `{ tenantId: 1 }` (and, where a hot query is always `tenantId + X`, a compound `{ tenantId: 1, X: 1 }`). Do **not** rework existing unique indexes.

### 4.3 Neo4j — add `tenantId` property

| Label | Change |
| :--- | :--- |
| `User` | `tenantId` required (all roles except `super_admin`, who has no node). |
| `Opportunity` | `tenantId` required. |
| `Event` | `tenantId` required. |
| `WorkExperience` | `tenantId` required. |
| `Education` | `tenantId` required (if it exists as a node in the code). |
| `Skill` | **Stays global/shared** (no `tenantId`). |
| `Company` (if the code has such a node) | **Stays global/shared.** Treat exactly like `Skill`. |

Add plain indexes (idempotent, `IF NOT EXISTS`) on `tenantId` for each tenant-owned label. Keep all existing uniqueness constraints and full-text indexes.

Note: Neo4j **existence constraints** (`IS NOT NULL`) are Enterprise-only; enforce presence of `tenantId` in code (the wrapper in Phase 1 does this).

## 5. The shared-node bridge risk (`Skill`, `Company`)

Shared nodes are **bridges between tenants**. Any traversal such as `User → Skill ← User` that does not filter the far-end node by `tenantId` leaks users across universities.

**Rule:** every pattern that reaches a `User`, `Opportunity`, `Event`, `WorkExperience` or `Education` node must carry `tenantId: $tenantId` on **every** such node in the pattern — not only the start node. Never traverse *through* a shared node to reach another tenant's node.

## 6. Tenant context & enforcement (fail closed)

1. **JWT payload** gains `tenantId` (and keeps existing claims). `super_admin` tokens have no `tenantId`.
2. A **global guard** (after JWT auth) loads the tenant from an in-memory cache (TTL ~60s), rejects the request if the tenant is `suspended` (403), and stores `tenantId` in **CLS** (`nestjs-cls`, AsyncLocalStorage).
3. **Mongo:** a Mongoose plugin auto-adds `tenantId` to every query/aggregate on schemas that have a `tenantId` path, and sets it on every write. **If there is no tenant in CLS it throws** (fail closed). Opt-out only via an explicit `skipTenantScope` query option (used by login lookup, super-admin code, migrations).
4. **Neo4j:** every query goes through a `TenantNeo4jService.run()` wrapper which injects `$tenantId` from CLS and **throws** if a Cypher string mentions a tenant-owned label without `$tenantId`. Opt-out only via an explicit `{ skipTenantScope: true }` option.
5. **Cross-tenant resource access returns `404`, not `403`** (so IDs cannot be probed).
6. **Old tokens** (no `tenantId` for a non-super-admin) are rejected with `401` and a "please log in again" message.

## 7. Registration & approval

- New public `GET /api/tenants` lists active universities for a picker.
- `POST /api/auth/register` gains required `tenant_id`.
  - Tenant must exist and be `active`.
  - If `allowed_email_domains` is non-empty, `student`/`alumni` emails must match one of the domains. `partner` is exempt.
  - New `UserAuth` + Neo4j `User` get that `tenantId`, status `pending`.
- Approval flow is unchanged but **scoped**: a tenant admin sees and approves only pending accounts in their tenant (cross-tenant IDs → 404).
- Loosen UET-specific format validation (roll number, batch, degree): accept free text / permissive patterns so other universities can register.

## 8. Tenant onboarding (manual)

Super admin calls `POST /api/super-admin/tenants` with tenant fields + first admin credentials. This creates the tenant, a `UserAuth` (role `admin`, `approved`, `tenantId`), and the admin's Neo4j `User` node **if** the current admin flow creates one (verify in code).

## 9. Suspension

`suspended` tenant ⇒ all of its users get `403` on every authenticated request (within the cache TTL) and on login. Data is retained. `super_admin` can reactivate.

## 10. Explicitly out of scope (do NOT build)

- Payments, plans, quotas, usage limits, invoices.
- Subdomain/custom-domain routing, branding engines, per-tenant email templates (optional only if trivial).
- Cross-tenant connections, chat, feed, search, partners, opportunities.
- Global identity with multiple memberships.
- Per-tenant validation-rule engines.
- Self-service tenant signup.
- Changing the hard-delete behavior of `DELETE /api/alumni/me` and `DELETE /api/student/me` (open decision D4).
