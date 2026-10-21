# 🤖 AGENTS.md — Unison AI Developer & Operating Manual

> **Welcome Agent!** Read this file first. It contains the essential architecture invariants, directory layouts, and rules of engagement for the UNISON multi-tenant backend. Following these guidelines guarantees fast, token-efficient, and error-free code generation.

---

## ⚡ Quick Repository Facts
- **Framework**: NestJS 12 + TypeScript (strict mode)
- **Database Architecture**: **Pooled Dual-Database** (Single MongoDB + Single Neo4j Community instance for all tenants)
- **Multi-Tenancy Model**: Logical isolation via `tenantId` UUID stamped on every tenant-owned record
- **Execution Context**: `nestjs-cls` (`AsyncLocalStorage`) carries `tenantId`, `userId`, `userRole`
- **APIs**: REST (`/api/...`) + Code-First GraphQL (`/graphql`) + WebSockets (`/socket.io`)
- **Key Branch**: `feat/multi-tenant`
- **Build Command**: `npm run build` (must always compile with 0 errors)
- **Test Command**: `npm run test:e2e` (`test/tenant-isolation.e2e-spec.ts`)

---

## 🧱 The Non-Negotiable Invariants

1. **Dual-Database Responsibility Matrix**:
   - **MongoDB** owns: `UserAuth` (credentials/status/role), `Tenant` (branding/domains), `Conversation` & `Message` (chat), `Notification`, `Announcement`, `Activity`, `OTPRecord`.
   - **Neo4j** owns: Graph social network (`:User`, `:Opportunity`, `:Event`, `:WorkExperience`, `:Education`, `:Skill`).
   - Platform `super_admin` exists **only** in MongoDB (`UserAuth`), never in Neo4j.

2. **Strict Fail-Closed Isolation**:
   - Every tenant-owned MongoDB model must declare `@Prop({ type: String, required: true, index: true }) tenantId: string;`. The global `tenantScopePlugin` automatically injects `{ tenantId }` into queries and validates on `save`/`insertMany`. Queries without CLS `tenantId` throw immediately.
   - Every tenant-owned Neo4j query MUST use `TenantNeo4jService.run(cypher, params)`. The wrapper verifies Cypher contains `$tenantId` and injects it from CLS.
   - If an operation touches unauthenticated or cross-tenant resources, **return `404 Not Found`** (never `403` which allows tenant enumeration).

3. **No Cross-Tenant Bridges via Shared Nodes**:
   - `:Skill` nodes are global taxonomy and do NOT have `tenantId`.
   - Any query traversing through `:Skill` (e.g. `(u1:User)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u2:User)`) **MUST** constrain both endpoints: `u1.tenantId = $tenantId AND u2.tenantId = $tenantId`.

4. **Role Hierarchy**:
   - `super_admin`: Platform-level operator. Bypasses tenant scoping via `skipTenantScope: true`. **CANNOT** access university tenant admin routes (`RolesGuard` rejects with 403).
   - `admin` / `moderator`: University staff. Strictly scoped to their own `tenantId`. **CANNOT** access `/api/super-admin/*` (403).
   - `alumni`, `student`, `partner`: University members. Strictly scoped to their own `tenantId`.

5. **GraphQL Parity**:
   - Every REST capability (except WebSockets) has a corresponding GraphQL code-first query/mutation under `src/graphql/resolvers/`.
   - GraphQL resolvers use the exact same guards (`JwtAuthGuard`, `RolesGuard`, `SuperAdminGuard`) and CLS context.

---

## 🗺️ Codebase Map (Where Everything Lives)

| Domain | REST Controller | Business Service | Mongoose Schema / Neo4j Node | GraphQL Resolver |
| :--- | :--- | :--- | :--- | :--- |
| **Tenants** | `src/tenants/tenants.controller.ts` | `src/tenants/tenants.service.ts` | Mongo: `src/tenants/schemas/tenant.schema.ts` | `src/graphql/resolvers/tenants.resolver.ts` |
| **Super Admin** | `src/super-admin/super-admin.controller.ts` | `src/super-admin/super-admin.service.ts` | Platform cross-tenant queries | `src/graphql/resolvers/super-admin.resolver.ts` |
| **Auth** | `src/auth/auth.controller.ts` | `src/auth/auth.service.ts` | Mongo: `user-auth.schema.ts`, `otp.schema.ts` | `src/graphql/resolvers/auth.resolver.ts` |
| **Profiles** | `src/profiles/profiles.controller.ts` | `src/profiles/profiles.service.ts` | Neo4j: `:User`, `:WorkExperience`, `:Education` | `src/graphql/resolvers/profiles.resolver.ts` |
| **Opportunities** | `src/opportunity/opportunity.controller.ts` | `src/opportunity/opportunity.service.ts` | Neo4j: `:Opportunity` | `src/graphql/resolvers/opportunity.resolver.ts` |
| **Events** | `src/events/events.controller.ts` | `src/events/events.service.ts` | Neo4j: `:Event` | `src/graphql/resolvers/events.resolver.ts` |
| **Admin** | `src/admin/admin.controller.ts` | `src/admin/admin.service.ts` | Mongo: `announcement.schema.ts`, Neo4j queries | `src/graphql/resolvers/admin.resolver.ts` |
| **Announcements**| `src/admin/admin.controller.ts` | `src/admin/admin.service.ts` | Mongo: `announcement.schema.ts` | `src/graphql/resolvers/announcements.resolver.ts` |
| **Search** | `src/search/search.controller.ts` | `src/search/search.service.ts` | Neo4j full-text indexes (`user_search`, `opp_search`) | `src/graphql/resolvers/profiles.resolver.ts` |
| **Connections** | `src/connections/connections.controller.ts` | `src/connections/connections.service.ts` | Neo4j: `CONNECTED_TO`, `FOLLOWS`, `BLOCKED` | Integrated in profiles |
| **Network Science**| `src/network/network.controller.ts` | `src/network/network.service.ts` | Neo4j graph algorithms (scoped to `$tenantId`) | Integrated in admin / analytics |
| **Chat** | `src/chat/chat.controller.ts` | `src/chat/chat.service.ts` | Mongo: `conversation.schema.ts`, `message.schema.ts` | WebSockets gateway |
| **Notifications**| `src/notification/notification.controller.ts`| `src/notification/notification.service.ts` | Mongo: `notification.schema.ts` | Realtime Socket.io push |
| **GraphQL Schema**| N/A | N/A | `src/graphql/types/graphql.types.ts` | `src/graphql/app-graphql.module.ts` |

---

## 📖 Deep Dives & Handbooks
When you need exhaustive API specifications or architectural diagrams:
- **Exhaustive API Handbook**: [docs/complete_api_handbook.md](file:///docs/complete_api_handbook.md)
- **Architectural Schema & Flows**: [docs/architectural_schema.md](file:///docs/architectural_schema.md)
- **Fast Feature Developer Guide**: [docs/DEVELOPER_GUIDE.md](file:///docs/DEVELOPER_GUIDE.md)
- **Tenant Audit & Decisions**: [docs/multitenancy/AUDIT.md](file:///docs/multitenancy/AUDIT.md)
- **Design Decisions**: [docs/01_DESIGN_DECISIONS.md](file:///docs/01_DESIGN_DECISIONS.md)
- **Test Specifications**: [docs/04_ISOLATION_TESTS_AND_AUDIT.md](file:///docs/04_ISOLATION_TESTS_AND_AUDIT.md)
