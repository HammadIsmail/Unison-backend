# UNISON Multi-Tenant Conversion — Master Brief (READ THIS FIRST)

You are converting the existing **UNISON** backend (NestJS, MongoDB + Neo4j, Socket.io, Cloudinary) from a **single-university** alumni platform into a **multi-tenant** platform where many universities each get an isolated organization on the same deployment.

This is a **working prototype**, not a production SaaS. Favor the simplest approach that gives *real data isolation*. Do not add complexity that is not listed here.

## Files in this pack (read in this order)

| # | File | Purpose |
| :-- | :--- | :--- |
| 00 | `00_README_START_HERE.md` | This file: goal, rules, phases, open decisions |
| 01 | `01_DESIGN_DECISIONS.md` | The tenancy model, data model, auth/JWT/roles, what is in/out of scope |
| 02 | `02_IMPLEMENTATION_PLAN.md` | Phased tasks with code sketches, in the order to execute them |
| 03 | `03_ENDPOINT_IMPACT.md` | Per-module / per-endpoint changes and all new endpoints |
| 04 | `04_ISOLATION_TESTS_AND_AUDIT.md` | Cross-tenant test matrix, grep audit, definition of done |

The two existing documents (`architectural_schema.md` and `complete_api_handbook.md`) describe the **current** system. This pack describes the **delta**.

## Hard constraints (from the product owner)

1. **One MongoDB instance and one Neo4j instance (single database each).** No database-per-tenant. Pooled model: every tenant-owned record carries `tenantId`.
2. **No payments / billing / plans / limits.** Do not add Stripe, plan tables, quotas or metering.
3. **Keep it simple.** No subdomains, no custom domains, no per-tenant theming engine, no per-tenant validation config engine, no cross-tenant networking.
4. **Email and username stay globally unique** (existing uniqueness constraints stay as they are).
5. **Tenant isolation is the #1 requirement.** One missed filter = one university seeing another's alumni. The design below is built to **fail closed** (throw) rather than leak.

## Ground rules for you (the agent)

- **This brief was written from the two docs, not from the source code.** Before changing anything, read the codebase and verify every assumption. Where the code differs from this pack (file names, service names, whether admin has a Neo4j `User` node, whether a `Company` node exists, etc.), **follow the code's reality and note the difference** in `docs/multitenancy/AUDIT.md`.
- Work on a new branch: `feat/multi-tenant`. Commit once per phase with a clear message.
- **Do not change existing request/response shapes** except where this pack says so. Additions (new fields such as `tenant`) are fine; removals/renames are not.
- Do not rename existing roles. `admin` stays and now means *university admin*. `super_admin` is new.
- Do not "fix" unrelated inconsistencies you notice in the docs (numbering, status codes, enum differences). If you spot something important, list it at the end of `AUDIT.md` under "Noticed, not changed".
- Keep Mongo + Neo4j compensation/rollback logic (admin status/role changes) working, and make it tenant-aware.
- After each phase: `npm run build` must pass. Run existing tests if present.
- Never run migrations or tests against production data. Migrations are idempotent and must be safe to run twice.
- If something is genuinely ambiguous and not covered here, choose the simplest option that preserves isolation, and record the choice in `AUDIT.md` under "Decisions made".

## Phases (execute in order; details in `02_IMPLEMENTATION_PLAN.md`)

| Phase | Name | Output |
| :-- | :--- | :--- |
| 0 | Recon & audit | `docs/multitenancy/AUDIT.md` (no code changes) |
| 1 | Foundation | Tenant module, CLS tenant context, JWT change, guards, Mongo plugin, Neo4j wrapper |
| 2 | Migration & seed | Idempotent script: default tenant, backfill `tenantId`, super admin, Neo4j indexes |
| 3 | Auth changes | Register with `tenant_id`, login, token validation, loosened UET-specific validation |
| 4 | Scope Mongo modules | Auth/Chat/Notification/Activity/Announcement fully tenant-scoped |
| 5 | Scope Neo4j modules | Every Cypher query scoped; skill/company bridge safety |
| 6 | Realtime & broadcast | Socket.io rooms, presence, announcement fan-out |
| 7 | New endpoints | Public tenants list, super-admin tenant management, tenant-admin tenant settings |
| 8 | Tests, audit, docs | Isolation e2e suite, grep audit, updated API handbook + schema doc |

## Open decisions (defaults chosen; product owner may override)

| # | Question | Default used in this pack |
| :-- | :--- | :--- |
| D1 | Can a company (partner) post to multiple universities? | **No.** Partners belong to exactly one tenant and are approved by that tenant's admin. |
| D2 | Can one person be in two universities with the same email? | **No.** Email is globally unique. |
| D3 | Self-service university signup? | **No.** Super admin creates tenants manually. |
| D4 | Convert `DELETE /api/alumni/me` and `DELETE /api/student/me` from permanent delete to soft delete? | **Not in this task.** Leave behavior unchanged (flagged in AUDIT.md as a known inconsistency). |
| D5 | Per-tenant Cloudinary folders, per-tenant email templates? | **Optional / nice-to-have** — do only if the upload/email helper is centralized and it is a trivial change. |

## Definition of done

See `04_ISOLATION_TESTS_AND_AUDIT.md` → "Definition of done". In short: the cross-tenant test suite passes, the grep audit is clean, the migration ran on a copy of real data, and the existing UET tenant behaves exactly as before.
