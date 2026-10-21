# 03 — Endpoint & Module Impact

Legend: **S** = must be tenant-scoped (data from this tenant only). **404x** = a resource ID from another tenant must return `404`. **No change** = behavior unchanged.

Global behavior changes:
- Every authenticated request: JWT must carry `tenantId` (except `super_admin`); tenant must be `active` else `403` `{ "message": "This university's access has been suspended." }`.
- Old tokens without `tenantId` → `401` `{ "message": "Session outdated. Please log in again." }`.
- Cross-tenant IDs → `404` with the same message the endpoint uses for "not found".

---

## Changed endpoints

### 🔐 Authentication

| Endpoint | Change |
| :--- | :--- |
| `POST /api/auth/send-otp` | No change. |
| `POST /api/auth/verify-otp` | No change. |
| `POST /api/auth/register` | **New required field `tenant_id`** (UUID from `GET /api/tenants`). Validate tenant exists + active; enforce `allowed_email_domains` for student/alumni; stamp `tenantId` on `UserAuth` and Neo4j `User`. Loosen UET-specific format checks (roll number, batch, degree). |
| `POST /api/auth/login` | Request unchanged. Response adds `tenant: { id, slug, name, logo_url }` (null for super_admin) and `profile.tenant_id`. Blocks login if tenant suspended. JWT includes `tenantId`. |
| `POST /api/auth/reset-password` | No change in contract. |

New error on register: `400 { "message": "Invalid or inactive university." }`; `400 { "message": "Email domain is not allowed for this university." }`.

### 👨‍💼 Admin (role `admin`, now = university admin)

Everything below is **S** and **404x**.

| Endpoint | Notes |
| :--- | :--- |
| `GET /api/admin/pending-accounts` | Only this tenant's pending accounts. |
| `PATCH /api/admin/approve-account/:id` / `reject-account/:id` | 404x. Emails/notifications as before. |
| `PATCH /api/admin/bulk/approve` / `bulk/reject` | IDs from other tenants count as **failed** (and must not be modified). |
| `GET /api/admin/dashboard-stats` | All counts (`total_alumni`, `total_students`, `pending_accounts`, `total_opportunities`, `total_companies`, `most_common_skills`) computed within the tenant. |
| `GET /api/admin/all-alumni`, `all-students`, `all-partners` | Tenant only. |
| `DELETE /api/admin/remove-account/:id`, `PATCH restore-account/:id`, `GET deleted-users` | Tenant only; 404x. Compensation/rollback logic must remain intact and tenant-aware. |
| `PATCH /api/admin/request-email-change`, `verify-email-change` | No change (self-service on own account). |
| `GET /api/admin/recent-activity` | Tenant activity only. |
| `GET /api/admin/upgrade-requests`, `PATCH approve-upgrade/:id`, `reject-upgrade/:id` | Tenant only; 404x. |
| `GET /api/admin/advanced-analytics` | Skill gap, growth trends, engagement, departmental mapping, curriculum alignment score, mentorship density: **populations filtered by tenant first**. |
| `GET /api/admin/opportunities`, `DELETE /api/admin/opportunities/:id` | Tenant only; 404x. |
| `GET /api/admin/events`, `DELETE /api/admin/events/:id` | Tenant only; 404x. |
| `GET /api/admin/export/:role` | CSV contains only this tenant's users. |
| `POST /api/admin/announcements` | Stamps `tenantId`; **recipients = approved, non-deleted users of this tenant only**; response count reflects that. |
| `GET /api/admin/announcements`, `GET /:id`, `DELETE /:id` | Tenant only; 404x. |

The `admin` guard must require `role === 'admin'` **and** a `tenantId`. `super_admin` must be rejected here.

### 👤 Alumni / 🎓 Student / 🤝 Partner / 📋 Profile Management

| Endpoint group | Change |
| :--- | :--- |
| `GET /api/{alumni,student,partner}/me` | S (own record). |
| `GET /api/{alumni,student,partner}/connections`, `GET /api/alumni/batch-mates` | S. Batch-mates only from own tenant. |
| `DELETE /api/partner/me` (soft), `DELETE /api/alumni/me`, `DELETE /api/student/me` | Scoped to own record. **Behavior unchanged** (open decision D4). |
| `POST /api/student/upgrade-request` | S. Goes to own tenant's admin queue. |
| `PUT /api/profile/me`, work-experience / skills / education CRUD | S. New `WorkExperience`/`Education` nodes get `tenantId`. Skill nodes remain global (MERGE by name). 404x on `:id`. |

### 🔗 Connections

| Endpoint | Change |
| :--- | :--- |
| `POST /api/connections/request/:target_id` | Target must be in the same tenant, else `404`. |
| `GET requests`, `GET requests/sent`, `DELETE request/:target_id`, `PATCH requests/:sender_id/respond`, `GET status/:target_id`, `DELETE /:target_id` | S; 404x on IDs. |
| `POST block/:target_id`, `DELETE unblock/:target_id`, `POST follow/:target_id`, `DELETE unfollow/:target_id`, `GET /:target_id/followers`, `GET /:target_id/following`, `GET blocked` | S; 404x on IDs. |

### 🎭 Profiles & 🔎 Search

| Endpoint | Change |
| :--- | :--- |
| `GET /api/profiles/user/:id` | 404x. Every nested list (work experience, education, opportunities posted, counts) filtered to tenant. |
| `GET /api/profiles/suggestions` | Strictly same-tenant; skill-based suggestions must not traverse across tenants through shared `Skill` nodes. |
| `GET /api/search/users`, `/opportunities`, `/suggestions` | Tenant only (full-text post-filter, over-fetch). |
| `GET /api/search/user/:username` | Username is global, but result must be same-tenant else `404`. |

### 💼 Opportunities & Events

| Endpoint | Change |
| :--- | :--- |
| `POST /api/opportunities` | Stamps `tenantId`. Creating user's role rules unchanged. |
| `GET /api/opportunities`, `/:id`, `/my-posts` | S; 404x. |
| `PUT /api/opportunities/:id`, `DELETE /api/opportunities/:id` | S; 404x. Poster-or-admin rule unchanged, with admin = *same tenant's* admin. |
| Events endpoints (wherever they live) | Same treatment as opportunities. |

### 🛠 Skills

| Endpoint | Change |
| :--- | :--- |
| `GET /api/skills/all` | Skills stay a global taxonomy, so listing all skill **names** is acceptable. If cheap, restrict to skills used by this tenant's users/opportunities. Default: leave global. |
| `DELETE /api/skills/:skill_id` | Removes the relationship from the authenticated user only. Never deletes the shared `Skill` node. |

### 📊 Network Science

All four/five endpoints are **S**: centrality, shortest-path (both IDs in tenant; all path nodes in tenant), top-companies, skill-trends, batch-analysis. Restrictions by role unchanged (admin; skill-trends also alumni/student).

### 💬 Chat / 🔔 Notifications / WebSockets (Socket.io)

| Area | Change |
| :--- | :--- |
| Start conversation / send message | Other participant must be same tenant (else 404). Messages and conversations carry `tenantId`. 3-minute edit/delete window unchanged. |
| Conversation list/history | S. |
| Notifications list/mark-read | S. |
| Socket handshake | JWT validated; join `tenant:{tenantId}` and `tenant:{tenantId}:user:{userId}`. |
| Presence / typing / read receipts / new message / notification push | Emitted only within tenant rooms or to the same-tenant participants. **No global emits.** |

---

## New endpoints

### Public

#### `GET /api/tenants`
No auth. Lists **active** tenants for the registration picker. Rate-limit lightly if a throttler exists.

Response `200`:
```json
[
  { "id": "uuid-tenant-1", "slug": "uet-faisalabad", "name": "UET Lahore (Faisalabad Campus)", "logo_url": null }
]
```
(Do not expose `allowed_email_domains`, contact email, or status.)

### Super admin (`role = super_admin`, base path `/api/super-admin`)

All routes use the explicit `skipTenantScope` data-access path; none rely on CLS.

#### `POST /api/super-admin/tenants`
Creates a tenant and its first admin.

Request body:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Required** | University name |
| `slug` | String | **Required** | Unique, `^[a-z0-9-]{2,40}$` |
| `contact_email` | String | *Optional* | |
| `logo_url` | String | *Optional* | |
| `allowed_email_domains` | String[] | *Optional* | e.g. `["uet.edu.pk"]` |
| `admin.email` | String | **Required** | First admin's email (globally unique) |
| `admin.password` | String | **Required** | Min 8 chars |
| `admin.display_name` | String | **Required** | |
| `admin.username` | String | **Required** | Globally unique |

Behavior: create tenant (uuid), create `UserAuth` (`role: admin`, `account_status: approved`, `tenantId`), and the admin's Neo4j `User` node **if the existing admin model has one**. Roll back the tenant if admin creation fails (compensation, same spirit as existing admin service). Log an Activity entry in the **new tenant** context.

Response `201`: `{ "message": "Tenant created.", "tenant": { "id": "...", "slug": "...", "name": "..." } }`
Errors: `409` slug/email/username already used.

#### `GET /api/super-admin/tenants`
Query: `page`, `limit`, `search`, `status`. Response: `{ total, page, data: [{ id, slug, name, status, created_at, counts: { users, alumni, students, partners, pending } }] }`. Counts are aggregated per tenant (counts only, **no user PII**).

#### `GET /api/super-admin/tenants/:id`
Tenant details + the same counts. 404 if missing.

#### `PUT /api/super-admin/tenants/:id`
Update `name`, `logo_url`, `contact_email`, `allowed_email_domains` (slug immutable). Invalidate tenant cache.

#### `PATCH /api/super-admin/tenants/:id/suspend`
Body: `{ "reason": "string (optional)" }`. Sets `status = suspended`. Invalidate cache. Response: `{ "message": "Tenant suspended." }`

#### `PATCH /api/super-admin/tenants/:id/reactivate`
Sets `status = active`. Invalidate cache. Response: `{ "message": "Tenant reactivated." }`

#### `GET /api/super-admin/stats`
Platform-wide **aggregate counts only** (tenants, users by role, opportunities, events). No per-user data, no cross-tenant listings of people.

### Tenant admin (`role = admin`)

#### `GET /api/admin/tenant`
Returns own tenant: `{ id, slug, name, logo_url, contact_email, allowed_email_domains, status }`.

#### `PUT /api/admin/tenant`
Updates only `name`, `logo_url`, `contact_email`, `allowed_email_domains` of **own** tenant (tenant taken from CLS; no ID in the path). Invalidate cache.

---

## Frontend impact (for whoever updates the client)

1. Registration screen: fetch `GET /api/tenants`, show a university picker, send `tenant_id`.
2. Login response: read `tenant` for branding (name/logo); handle `403` suspended and `401` session-outdated.
3. New super-admin screens (tenant list/create/suspend) — can be minimal.
4. Loosened validation for roll number / batch / degree — update client-side validators accordingly.
