# Multi-Tenancy Architecture Audit & Reconnaissance (Phase 0)

## 1. MongoDB Inventory

| Schema / Model | File Path | Collection | Needs `tenantId` | Rationale / Index |
| :--- | :--- | :--- | :--- | :--- |
| `UserAuth` | `src/auth/schemas/user-auth.schema.ts` | `userauths` | Yes | Nullable only for `super_admin`. Plain index on `tenantId`. Role enum includes `super_admin`. |
| `Conversation` | `src/chat/schemas/conversation.schema.ts` | `conversations` | Yes | Required. Plain index on `tenantId`. Compound index `{ tenantId: 1, participants: 1 }`. |
| `Message` | `src/chat/schemas/message.schema.ts` | `messages` | Yes | Required. Inherits from conversation. Index on `tenantId`. |
| `Notification` | `src/notification/schemas/notification.schema.ts` | `notifications` | Yes | Required. Index on `tenantId`. Compound index `{ tenantId: 1, recipient: 1 }`. |
| `Activity` | `src/common/activity/schemas/activity.schema.ts` | `activities` | Yes | Required. Index on `tenantId`. |
| `Announcement` | `src/admin/schemas/announcement.schema.ts` | `announcements` | Yes | Required. Index on `tenantId`. |
| `OTPRecord` | `src/auth/schemas/otp.schema.ts` | `otprecords` | **No** | Pre-auth verification; keyed by email and purpose. Tenant is not known at OTP send time. |
| `Tenant` | `src/tenants/schemas/tenant.schema.ts` | `tenants` | **No** | Represents the tenant root itself; excluded from scoping plugin. |

---

## 2. Neo4j Inventory

### 2.1 Node Labels & Tenancy Scoping
| Label | Status in Codebase | Scoped by `tenantId`? | Notes |
| :--- | :--- | :--- | :--- |
| `User` | Active | **Yes** | Required for all users (`alumni`, `student`, `partner`, `admin`). `super_admin` has NO Neo4j node. |
| `Opportunity` | Active | **Yes** | Required. Created by alumni/partner/admin. |
| `Event` | Active | **Yes** | Required. Created by users; RSVP relationships scoped. |
| `WorkExperience` | Active | **Yes** | Required. Linked to User via `HAS_EXPERIENCE`. |
| `Education` | Active | **Yes** | Required. Linked to User via `HAS_EDUCATION`. |
| `Skill` | Active | **No (Global / Shared)** | Shared taxonomy across universities. Must not be used as an unfiltered traversal bridge. |
| `Company` | **Does NOT exist as a node** | N/A | Companies are string properties (`company_name` on Opportunity, `company` on WorkExperience). |

### 2.2 Relationship Types
- `HAS_EDUCATION`: `(User)-[:HAS_EDUCATION]->(Education)`
- `HAS_EXPERIENCE`: `(User)-[:HAS_EXPERIENCE]->(WorkExperience)`
- `HAS_SKILL`: `(User)-[:HAS_SKILL]->(Skill)`
- `POSTED`: `(User)-[:POSTED]->(Opportunity)`
- `REQUIRES_SKILL`: `(Opportunity)-[:REQUIRES_SKILL]->(Skill)`
- `CONNECTED_TO`: `(User)-[:CONNECTED_TO]->(User)`
- `FOLLOWS`: `(User)-[:FOLLOWS]->(User)`
- `BLOCKED`: `(User)-[:BLOCKED]->(User)`
- `CREATED_EVENT`: `(User)-[:CREATED_EVENT]->(Event)`
- `RSVP`: `(User)-[:RSVP]->(Event)`

### 2.3 Admin Representation
- Current codebase: `admin` is created as a `User` node in Neo4j with `role: 'admin'`, plus a MongoDB `UserAuth` entry.
- Multi-tenant architecture:
  - University `admin`: Has both Mongo `UserAuth` (role `admin`) and Neo4j `User` node (role `admin`), with `tenantId` set to their university's tenant ID.
  - Platform `super_admin`: Has **only** a Mongo `UserAuth` record (`role: 'super_admin'`, `tenantId: null`). No Neo4j node is created.

---

## 3. Query-Site Inventory

### 3.1 Neo4j Cypher Query Call Sites
Every call site must use `TenantNeo4jService.run` and enforce `$tenantId` on all tenant-owned nodes:
- `src/auth/auth.service.ts`: Check existing username, create user profile, query admins for notifications.
- `src/common/strategies/jwt.strategy.ts`: User token lookup (must scope by `tenantId` for non-super-admin).
- `src/admin/admin.service.ts`: Pending accounts, approve/reject accounts, bulk operations, user listings, deletion/restoration, dashboard stats, analytics, export, opportunities, events.
- `src/alumni/alumni.service.ts`: Profile retrieval, batch-mates, connections list, account deletion.
- `src/student/student.service.ts`: Profile retrieval, connections, upgrade request status.
- `src/partner/partner.service.ts`: Profile retrieval, connections, soft-deletion.
- `src/profiles/profiles.service.ts`: Profile by ID, connection status, suggestions.
- `src/profile-management/profile-management.service.ts`: Work experience CRUD, education CRUD, bio & contact updates.
- `src/opportunity/opportunity.service.ts`: Create, list, details, my-posts, update, delete.
- `src/events/events.service.ts`: Create, list, details, update, delete, RSVP create/update/cancel/list.
- `src/feed/feed.service.ts`: Feed items aggregation (opportunities, events, connections).
- `src/connections/connections.service.ts`: Send request, accept/reject, cancel, followers, following, block/unblock.
- `src/search/search.service.ts`: Full-text user search, opportunity search, suggestion search, username lookup.
- `src/skill/skill.service.ts`: List distinct skill names, remove user skill link.
- `src/network/network.service.ts`: Shortest path, degree centrality, top companies, skill trends, batch analysis.
- `src/common/guards/post-rate-limit.guard.ts`: Opportunity and event posting rate limits.

### 3.2 Mongoose Query Call Sites
Managed automatically by `tenantScopePlugin(cls)` (with explicit `skipTenantScope: true` where required):
- `UserAuthModel`:
  - `auth.service.ts`: login email lookup (`skipTenantScope: true`), registration duplicate check (`skipTenantScope: true` or scoped), reset password.
  - `jwt.strategy.ts`: super_admin lookup (`skipTenantScope: true`).
  - `admin.service.ts`: approve/reject status, role update, soft-delete, restore.
  - `student.service.ts`: account deletion / upgrade.
  - `alumni.service.ts`: account deletion.
  - `partner.service.ts`: account deletion.
  - `super-admin.service.ts`: platform-wide user counts and admin provisioning (`skipTenantScope: true`).
- `OTPRecordModel`:
  - `auth.service.ts`: send OTP, verify OTP, cleanup. (Pre-auth, no tenant scoping).
- `ConversationModel` & `MessageModel`:
  - `chat.service.ts`: create conversation, list conversations, get messages, send message, edit/delete message. All scoped via CLS.
- `NotificationModel`:
  - `notification.service.ts`: create notification, get user notifications, mark read/all read. All scoped via CLS.
- `ActivityModel`:
  - `common/activity/activity.service.ts`: log activity, get recent activity. Scoped via CLS.
- `AnnouncementModel`:
  - `admin/admin.service.ts`: create announcement, list, get by ID, delete. Scoped via CLS.

### 3.3 Realtime & Socket.io Call Sites
- `src/chat/chat.gateway.ts`:
  - Current: User joining socket rooms, direct emits to sockets.
  - Required: Handshake extracts `tenantId` from verified JWT. Sockets join `tenant:{tenantId}` and `tenant:{tenantId}:user:{userId}`.
  - Handlers executed inside `cls.run()` with `tenantId` set.
- `src/notification/notification.gateway.ts`:
  - Notifications pushed specifically to `tenant:{tenantId}:user:{recipientId}`.
  - No global server broadcasts (`server.emit`).

### 3.4 Cron & Background Tasks
- No `@Cron()` decorators present in source.
- `MailProcessor` (`src/common/mail/mail.processor.ts`): processes transactional email sending via BullMQ queue.

---

## 4. Hard-Coded University / UET Assumptions

1. **DTOs & Swagger Examples:**
   - `auth.dto.ts`: Examples `ahmed@uet.edu.pk`, `2021-CS-101`, `BS Computer Science`.
   - `main.ts` & `scripts/generate-postman.ts`: Description mentions "Alumni Network — CS Department, UET Faisalabad".
2. **Format Validation:**
   - Roll number is validated with `@IsOptional() @IsString()`.
   - Batch is validated with `@IsOptional() @IsString()`.
   - Degree is validated with `@IsOptional() @IsString()`.
   - Semester is validated with `@IsOptional() @IsInt()`.
   - **Conclusion:** Registration format validations are already sufficiently generic. Email domain restrictions will be dynamically driven per tenant via `tenant.allowed_email_domains`.

---

## 5. Admin Seeding Current State
- Currently handled by `src/seed/admin.seed.ts` inserting a hardcoded admin into Neo4j Aura.
- Phase 2 idempotent migration `scripts/migrate-multitenant.ts` will:
  1. Create the default tenant (e.g. `uet-faisalabad`).
  2. Backfill existing MongoDB and Neo4j documents with `tenantId = defaultTenant.id`.
  3. Ensure default admin is associated with the default tenant.
  4. Seed `super_admin` in MongoDB if configured via environment variables (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`).

---

## 6. Token & Auth Internals
- **JWT Payload Shape:** `{ sub: string, email: string, role: string, tenantId?: string }`
- **Session Validation:**
  - `super_admin`: Verified against Mongo `UserAuth`, allowed without `tenantId`.
  - Non-super-admin: Must contain valid `tenantId`. Rejects tokens missing `tenantId` with `401 Unauthorized` ("Session outdated. Please log in again.").
  - Checks tenant status against cache: if suspended, throws `403 Forbidden` ("This university's access has been suspended.").
- **Soft Deletion & Account Status:**
  - Mongo `UserAuth.is_deleted` and `account_status` checked at login and during admin status modifications.
  - Neo4j `User.is_deleted` and `account_status` filtered in Cypher queries.

---

## 7. Decisions Made & Noticed, Not Changed

### Decisions Made:
- **D1:** Partners belong to exactly one tenant; no multi-tenant cross-posting.
- **D2:** User emails and usernames remain globally unique.
- **D3:** No self-service university signup; super-admin provisions tenants.
- **D4:** Deletion endpoints behavior kept as-is (alumni/student permanent delete, partner soft-delete).
- **D5:** Optional Cloudinary subfolder separation deferred to keep prototype simple.

### Noticed, Not Changed:
- `DELETE /api/partner/me` performs soft-deletion (`is_deleted: true`), whereas `DELETE /api/alumni/me` and `DELETE /api/student/me` perform permanent Neo4j detach-delete. Preserved per Open Decision D4.
- Neo4j does not have a `:Company` node label. Companies are stored as string properties (`company_name` on Opportunity, `company` on WorkExperience). Cypher queries treat them accordingly.

---

## 8. Final Grep Audit Verification (Phase 5/6)

| Audit Check | Command / Pattern | Result | Status |
| :--- | :--- | :--- | :--- |
| **Direct Neo4j Sessions** | `session.run` | Confined strictly to `src/neo4j/neo4j.service.ts`, migrations, and seeds. | **PASS** |
| **Unscoped Tenant Labels** | `:(User\|Opportunity\|Event\|WorkExperience\|Education)\b` | All application service queries use `TenantNeo4jService` with `$tenantId` matching. | **PASS** |
| **Mongoose Opt-Outs** | `skipTenantScope` | Restricted exclusively to `jwt.strategy.ts` (token lookup), `auth.service.ts` (pre-auth/login/registration uniqueness), `super-admin.service.ts` (platform counts), and `skill.service.ts` (global `:Skill`). | **PASS** |
| **Realtime Socket Emits** | `.emit(` | 100% of socket emits are scoped to `tenant:{tenantId}:user:{userId}` or `tenant:{tenantId}`. Zero global broadcasts. | **PASS** |
| **Client Tenant Spoofing** | DTO `tenantId` inspection | Clients cannot inject `tenantId` (except `tenant_id` at registration picker, which is validated against active university database). | **PASS** |

