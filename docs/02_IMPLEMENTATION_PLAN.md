# 02 — Implementation Plan (execute in order)

Branch: `feat/multi-tenant`. Commit per phase. Code below is **illustrative**: adapt names, imports and style to the actual codebase.

New env vars (add to `.env.example` and config validation):

```
DEFAULT_TENANT_SLUG=uet-faisalabad
DEFAULT_TENANT_NAME="UET Lahore (Faisalabad Campus)"
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
TENANT_CACHE_TTL_SECONDS=60
```

New dependency: `nestjs-cls`.

---

## Phase 0 — Recon & audit (no code changes)

Produce `docs/multitenancy/AUDIT.md` containing:

1. **Mongo inventory:** every schema/model, file path, and whether it needs `tenantId` (per `01_DESIGN_DECISIONS.md` §4.2).
2. **Neo4j inventory:** every node label and relationship type actually used in code; confirm whether `Education`, `Company`, `Event` exist as nodes; whether `admin` has a `User` node.
3. **Query-site inventory** (this is the most important list). For every file, list each call site of:
   - Cypher: `session.run(`, `tx.run(`, the project's Neo4j helper, plus any query-builder usage.
   - Mongoose: `.find(`, `.findOne(`, `.findById(`, `.findOneAnd*`, `.update*`, `.delete*`, `.countDocuments(`, `.aggregate(`, `.distinct(`, `.insertMany(`, `.create(`, `new Model(`.
   - Realtime: `server.emit`, `.to(`, `.in(`, `broadcast`, any "all users" fan-out.
   - Cron/scheduled jobs and startup scripts.
4. **Hard-coded UET assumptions:** regexes/enums/lists for roll number, batch, degree, department, email domain, university name strings.
5. **Admin seeding:** how the first admin is created today.
6. **Token/auth internals:** JWT payload shape, strategy, guards, where `account_status`/`is_deleted` is checked per request.
7. **Decisions made / Noticed, not changed** sections (empty for now).

Gate: continue to Phase 1 when the audit is written.

---

## Phase 1 — Foundation

### 1.1 Tenant module

Create `tenants` module: schema (see design §4.1), service, and a small **in-memory cache** (`Map<tenantId, {tenant, expiresAt}>`, TTL from env) exposing `getActiveTenantOrThrow(tenantId)` and `invalidate(tenantId)`.

```ts
@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, unique: true, index: true }) id: string;            // uuid v4
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) slug: string;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ enum: ['active', 'suspended'], default: 'active' }) status: string;
  @Prop({ type: [String], default: [] }) allowed_email_domains: string[];
  @Prop() logo_url?: string;
  @Prop() contact_email?: string;
  @Prop() suspended_reason?: string;
}
```

> The `Tenant` schema must **not** have a `tenantId` path, so the scoping plugin ignores it.

### 1.2 CLS tenant context

```ts
// app.module.ts
ClsModule.forRoot({ global: true, middleware: { mount: true } })
```

### 1.3 JWT + guard

- Add `tenantId` to the JWT payload at login (`null`/absent for `super_admin`).
- In the JWT strategy `validate()`:
  - `super_admin` → allowed without `tenantId`.
  - any other role without `tenantId` → `401` "Session outdated, please log in again."
- Add a **global `TenantContextGuard`** (runs after the JWT guard; skip `@Public()` routes):

```ts
canActivate(ctx) {
  const user = ctx.switchToHttp().getRequest().user;
  if (!user) return true;                                  // public route
  if (user.role === 'super_admin') return true;            // no tenant context on purpose
  const tenant = await this.tenants.getActiveTenantOrThrow(user.tenantId); // 403 if suspended, 401 if missing
  this.cls.set('tenantId', user.tenantId);
  return true;
}
```

- Roles: add `super_admin` to the role enum/decorator. Ensure the existing `admin` guard checks `role === 'admin'` only (super_admin must NOT pass it). Add `@Roles('super_admin')` support / a `SuperAdminGuard`.

### 1.4 Mongoose tenant-scope plugin (fail closed)

Register it **globally on the connection** (via `MongooseModule.forRootAsync({ connectionFactory })` with `ClsService` injected). If connection-level plugins don't apply to models in this project's setup, register it per schema with `forFeatureAsync`. Verify it actually applies (write a quick test: query without CLS must throw).

```ts
export const tenantScopePlugin = (cls: ClsService) => (schema: Schema) => {
  if (!schema.path('tenantId')) return;                    // only tenant-owned schemas

  const tenant = (opts?: any) => {
    if (opts?.skipTenantScope) return null;
    const t = cls.get('tenantId');
    if (!t) throw new Error('Tenant context missing (fail-closed)');
    return t;
  };

  const QUERY_OPS = [
    'find','findOne','findOneAndUpdate','findOneAndDelete','findOneAndReplace',
    'updateOne','updateMany','replaceOne','deleteOne','deleteMany','countDocuments','distinct',
  ] as const;

  schema.pre(QUERY_OPS as any, function (this: any) {
    const t = tenant(this.getOptions());
    if (t) this.setQuery({ ...this.getQuery(), tenantId: t });
  });

  schema.pre('aggregate', function (this: any) {
    const t = tenant(this.options);
    if (t) this.pipeline().unshift({ $match: { tenantId: t } });
  });

  schema.pre('save', function (this: any, next) {
    if (this.isNew && !this.tenantId) {
      const t = tenant();           // throws if missing
      this.tenantId = t;
    }
    next();
  });

  schema.pre('insertMany', function (next, docs: any[]) {
    const t = tenant();
    docs.forEach(d => { if (!d.tenantId) d.tenantId = t; });
    next();
  });
};
```

Also handle: `findOneAndUpdate`/`updateOne` with `upsert: true` → ensure `$setOnInsert: { tenantId }`; `findById` is covered because it maps to `findOne`. Note aggregation pipelines that begin with `$geoNear`/`$search` need special handling (check whether any exist).

**Opt-out usage** (explicit, grep-able): `Model.findOne({ email }).setOptions({ skipTenantScope: true })`.

### 1.5 Neo4j tenant wrapper (fail closed)

Wrap the project's existing Neo4j service. **Every** service must switch to this wrapper.

```ts
const TENANT_LABELS = /:\s*(User|Opportunity|Event|WorkExperience|Education)\b/;

@Injectable()
export class TenantNeo4jService {
  constructor(private readonly neo4j: Neo4jService, private readonly cls: ClsService) {}

  run(cypher: string, params: Record<string, any> = {}, opts: { skipTenantScope?: boolean } = {}) {
    if (opts.skipTenantScope) return this.neo4j.run(cypher, params);

    const tenantId = this.cls.get('tenantId');
    if (!tenantId) throw new ForbiddenException('Tenant context missing');
    if (TENANT_LABELS.test(cypher) && !cypher.includes('$tenantId')) {
      // throw in ALL environments: fail closed
      throw new Error(`Unscoped Cypher touches tenant-owned label: ${cypher.slice(0, 200)}`);
    }
    return this.neo4j.run(cypher, { ...params, tenantId });
  }
}
```

The regex check is a safety net, **not** a substitute for correct scoping: a query can contain `$tenantId` once and still leak through an unfiltered second node. Phase 5 rules apply.

If transactions (`session.beginTransaction`) are used, provide the same guard for `tx.run`.

---

## Phase 2 — Migration & seed (`scripts/migrate-multitenant.ts`, idempotent)

Take a **backup/export first**; run on a **copy** of real data before the real one.

Steps:

1. Create the default tenant if missing (slug/name from env, `status: 'active'`, `id = uuid v4`). Reuse it if the slug exists.
2. **Mongo backfill** (all with `skipTenantScope`): for `UserAuth` (excluding `super_admin`), Conversation, Message, Notification, Activity, Announcement:
   `updateMany({ tenantId: { $exists: false } }, { $set: { tenantId } })` (also treat `null` as missing, except `super_admin`).
3. **Neo4j backfill:** for each label in `User, Opportunity, Event, WorkExperience, Education` (only those that exist):
   `MATCH (n:<Label>) WHERE n.tenantId IS NULL SET n.tenantId = $tenantId`
4. **Neo4j indexes** (`IF NOT EXISTS`): one plain index on `tenantId` per tenant-owned label. Add these to the existing automated constraint/index init script too, so fresh databases get them.
5. **Mongo indexes:** `{ tenantId: 1 }` on every tenant-owned collection (via schema `index: true`).
6. **Super admin seed:** if `SUPER_ADMIN_EMAIL` is set and no `super_admin` exists, create a `UserAuth` with role `super_admin`, `account_status: 'approved'`, `tenantId: null`, bcrypt/argon (use the project's hashing) from `SUPER_ADMIN_PASSWORD`. No Neo4j node.
7. Print a **summary report**: counts updated per collection/label, and a verification pass that asserts **zero** tenant-owned records remain without `tenantId`. Exit non-zero if any remain.

Also: **invalidate existing sessions** (nothing to do beyond Phase 1.3 — old tokens lack `tenantId` and are rejected).

---

## Phase 3 — Auth changes

1. **Register** (`POST /api/auth/register`): add required `tenant_id`.
   - Load tenant (skipTenantScope), must be `active` → else `400` "Invalid or inactive university."
   - If `allowed_email_domains` non-empty and role ∈ {student, alumni} → email domain must match else `400`.
   - Create `UserAuth` + Neo4j `User` with that `tenantId`. The register route is public, so there is **no CLS tenant**: set it explicitly for the duration of the registration (`cls.run(() => { cls.set('tenantId', tenant.id); ... })`) rather than using skip flags everywhere.
   - Uniqueness checks (email/username) stay **global**.
2. **Login:** the email lookup runs **before** tenant context exists → use `skipTenantScope` on that one query. After finding the user:
   - reject if user's tenant is `suspended` (403 with message), except `super_admin`.
   - put `tenantId` in the JWT.
   - add `tenant: { id, slug, name, logo_url }` to the login response (`null` for super_admin) and `tenant_id` inside `profile`.
3. **OTP, reset-password, verify-email-change:** keyed by email; no tenant scoping on OTP collections. Where they touch `UserAuth`/Neo4j `User` records for a known user, use `skipTenantScope` (pre-auth) or the authenticated context (post-auth) as appropriate.
4. **Loosen UET-specific validation** found in the Phase 0 audit (roll number format, batch format, degree list, `uet.edu.pk`-style domain checks, hard-coded university names). Replace with permissive validation (non-empty string, sane length, safe charset). Keep `semester` numeric range checks.
5. **Brute-force/lockout & OTP rate limits:** keep as-is (keyed by email).

---

## Phase 4 — Scope all Mongo modules

For every module in the Phase 0 inventory:

- Add `tenantId` to the schema (`@Prop({ required: true, index: true })`; for `UserAuth` it is not required because of `super_admin`).
- Delete any manual one-off filter that the plugin now makes redundant **only if** you are certain; otherwise leave it (redundant filters are harmless).
- Review every call site: anything that must work **without** tenant context (login lookup, super-admin features, migration, tenant cache) gets an explicit `skipTenantScope`. Everything else relies on CLS.
- **Chat:** when creating a conversation, verify the other participant exists **in the same tenant** (else `404`). Messages inherit `tenantId` from the conversation. Conversation/message reads by ID are tenant-scoped automatically.
- **Notifications:** stamp `tenantId`; lists are scoped.
- **Activity:** stamp `tenantId`; `GET /api/admin/recent-activity` returns only this tenant's activity.
- **Announcements:** stamp `tenantId`; list/get/delete scoped; **broadcast targets only approved, non-deleted users of this tenant**; the response count (`"Announcement broadcasted to N users."`) must equal that tenant's recipient count.
- **Mongo ↔ Neo4j compensation logic** in the admin service: all reads/writes on both sides must be scoped; verify rollback still works when scoping is on.

---

## Phase 5 — Scope all Neo4j modules

Replace every direct DB call with `TenantNeo4jService.run`. Then rewrite every Cypher statement following these rules:

1. **Every** `User | Opportunity | Event | WorkExperience | Education` node in a `MATCH`/`OPTIONAL MATCH`/`MERGE`/`CREATE` carries `tenantId: $tenantId` (in the pattern or an immediate `WHERE`). Not just the first node.
2. **Creates** set `tenantId: $tenantId` on every new tenant-owned node.
3. **Shared nodes (`Skill`, `Company` if present):** `MERGE`/`MATCH` them without `tenantId`, but never use them as a hop toward another tenant's nodes. Filter the far end.
4. **Any `:id` parameter** (path or body) that identifies another user/opportunity/event is looked up with `tenantId`; a miss → `404`.
5. **Full-text search:** the index can't filter by tenant. Over-fetch and post-filter:

```cypher
CALL db.index.fulltext.queryNodes('user_search_index', $q, { limit: $overfetch }) YIELD node, score
WHERE node.tenantId = $tenantId AND coalesce(node.is_deleted, false) = false
RETURN node, score ORDER BY score DESC LIMIT $limit
```
   with `overfetch = max(100, limit * 10)`. Do the same for `opportunity_search_index`.
6. **Paths** (shortest path, suggestions, mutual connections): constrain every node in the path:

```cypher
MATCH (a:User {id: $from, tenantId: $tenantId}), (b:User {id: $to, tenantId: $tenantId})
MATCH p = shortestPath((a)-[:CONNECTED_TO*..6]-(b))
WHERE all(n IN nodes(p) WHERE n.tenantId = $tenantId)
RETURN p
```
7. **Aggregations** (dashboard stats, top companies, skill trends, batch analysis, centrality, skill-gap, departmental mapping, curriculum alignment, mentorship density): filter the *population* nodes by tenant **before** aggregating. Skill demand comes from this tenant's opportunities; skill supply from this tenant's users.
8. **Connection / follow / block** writes: both endpoints must be in the tenant; otherwise `404` (don't reveal existence).
9. **Soft-delete filters** (`is_deleted`) stay exactly as they are.

Before/after example:

```cypher
// BEFORE
MATCH (u:User {id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(o:User)
RETURN o

// AFTER
MATCH (u:User {id: $userId, tenantId: $tenantId})-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(o:User {tenantId: $tenantId})
RETURN o
```

---

## Phase 6 — Realtime & broadcast

- **Socket.io handshake:** verify JWT (existing logic), reject suspended tenants, reject tokens without `tenantId` (except super_admin who gets no tenant rooms). Join rooms:
  - `tenant:{tenantId}` and `tenant:{tenantId}:user:{userId}`
- Replace any global emit/broadcast with room-targeted emits. **No** `server.emit(...)` to everyone.
- **Presence** (online/offline, last_seen, typing, read receipts): emit only to the user's tenant room or the specific conversation participants (same tenant, already enforced).
- Socket event handlers run outside the HTTP request: wrap handler bodies in `cls.run(() => { cls.set('tenantId', socket.data.tenantId); ... })` so the Mongo plugin / Neo4j wrapper have context.
- Notification push: target `tenant:{tenantId}:user:{recipientId}`.
- Any cron/scheduled jobs: iterate tenants explicitly and set CLS per tenant.

---

## Phase 7 — New endpoints

Implement exactly what `03_ENDPOINT_IMPACT.md` §"New endpoints" specifies:

- `GET /api/tenants` (public).
- `/api/super-admin/*` tenant management (create/list/get/update/suspend/reactivate) + platform stats.
- `GET/PUT /api/admin/tenant` (tenant admin views/updates own tenant's name, logo, allowed domains).

Super-admin code uses `skipTenantScope` **explicitly and only there**. Invalidate the tenant cache on every tenant update/suspend/reactivate.

---

## Phase 8 — Tests, audit, docs

Follow `04_ISOLATION_TESTS_AND_AUDIT.md`. Additionally:

- Update `complete_api_handbook.md`: add a **Multi-Tenancy** section (auth changes, `tenant_id` on register, login response additions, 404-on-cross-tenant rule, suspension behavior) and the new endpoints.
- Update `architectural_schema.md`: add the Tenant entity, `tenantId` on schemas, enforcement layers (JWT → guard → CLS → Mongoose plugin / Neo4j wrapper), shared-node bridge rule.
- Update the Swagger/OpenAPI decorators for new/changed endpoints if the project uses them.
