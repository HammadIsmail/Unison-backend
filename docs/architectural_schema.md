# UNISON Backend Architectural Schema & Multi-Tenant Design Reasoning

This document outlines the architectural decisions, data schemas, multi-tenant isolation model, and GraphQL integration for the UNISON platform (NestJS 12).

---

## 1. High-Level Architecture
UNISON follows a **Modular Monolith** architecture built with **NestJS 12**, leveraging a **Hybrid Database Strategy** with **Pooled Multi-Tenancy**.

### Core Stack
- **Framework**: NestJS 12 (TypeScript 5/6)
- **Primary APIs**: REST & Code-First GraphQL (Apollo Server v5 / `@nestjs/graphql` v14)
- **Real-time**: Socket.io (Tenant-room partitioned WebSockets)
- **Databases**: 
  - **MongoDB 8/9 (Mongoose)**: Document storage with global fail-closed `tenantId` plugin.
  - **Neo4j 5 (Cypher)**: Pooled graph database partitioned with mandatory `tenantId` constraints and `TenantNeo4jService`.
- **Context Propagation**: `nestjs-cls` (Node.js `AsyncLocalStorage`)
- **Storage**: Cloudinary (Media assets)

---

## 2. Multi-Tenant Architecture & Isolation Model

UNISON operates as a SaaS platform where multiple universities/institutions share a single backend infrastructure, MongoDB cluster, and Neo4j database (**Pooled Multi-Tenancy**).

```
               [ Client HTTP / GraphQL Requests ]
                               |
               [ TenantContextGuard / JwtStrategy ]
                               |
            Populate AsyncLocalStorage (nestjs-cls)
                       tenantId = "uuid-v4"
                               |
            +------------------+------------------+
            |                                     |
   [ MongoDB Mongoose Plugin ]          [ TenantNeo4jService ]
   Auto-injects { tenantId }            Validates $tenantId on:
   Fails closed if missing              User, Opportunity, Event,
                                        WorkExperience, Education
            |                                     |
    Pooled MongoDB DB                     Pooled Neo4j DB
    (tenantId on every doc)               (tenantId on every node)
```

### 2.1 Core Invariants
1. **Single Pooled Databases**: No database-per-tenant, no schema-per-tenant. A single MongoDB database and a single Neo4j database host all tenant data.
2. **Mandatory Partition Key**: Every tenant-owned MongoDB document and Neo4j node carries a required `tenantId: string` UUID v4.
3. **Fail-Closed Security**: Any query touching tenant-owned data without a verified `tenantId` in context throws an error immediately (rejecting execution).
4. **404 Never 403**: Any cross-tenant data lookup returns `404 Not Found`, identical to querying a nonexistent ID. This prevents cross-tenant enumeration attacks.
5. **No Billing/Plans**: Universities are onboarded by the platform `super_admin` with no billing tiers.
6. **Global Account Uniqueness**: User emails and usernames are globally unique across the entire platform.

---

## 3. Fail-Closed Security Implementation

### 3.1 AsyncLocalStorage (`nestjs-cls`)
`ClsModule` runs globally across HTTP and GraphQL requests.
- When a user authenticates via JWT, `JwtStrategy` validates the token, retrieves `payload.tenantId`, validates active tenant status in cache, and populates `cls.set('tenantId', payload.tenantId)`.
- If the token lacks `tenantId` and is not `super_admin`, authentication fails closed with `401 Unauthorized: Session outdated. Please log in again.`.
- If the tenant is suspended, authentication fails closed with `403 Forbidden: This university's access has been suspended.`.

### 3.2 Mongoose Scoping Plugin (`tenant-scope.plugin.ts`)
Attached to Mongoose schemas via `connectionFactory`:
- Automatically hooks `find`, `findOne`, `findOneAndUpdate`, `updateOne`, `deleteMany`, `countDocuments`, `aggregate`, and `save`.
- Injects `{ tenantId }` into query criteria and aggregation pipelines.
- Automatically stamps `doc.tenantId = tenantId` on new documents.
- Fails closed if CLS `tenantId` is absent (unless query explicitly sets `{ skipTenantScope: true }` for global auth/tenant lookup).

### 3.3 Neo4j Cypher Scoping Wrapper (`TenantNeo4jService`)
All domain services interact with Neo4j through `TenantNeo4jService`:
- Regex check validates that any query touching `User`, `Opportunity`, `Event`, `WorkExperience`, or `Education` references `$tenantId`.
- Auto-injects `$tenantId` from CLS into Cypher parameter maps.
- Fails closed if query touches tenant labels without `$tenantId` or if CLS context is missing.

### 3.4 Shared-Node Bridge Prevention
In graph databases, shared taxonomy nodes (such as `:Skill`) can accidentally become bridges connecting users of University A to opportunities or users of University B.
- **Prevention Rule**: All traversals starting from or passing through `:Skill` nodes MUST explicitly bind the target nodes to the tenant:
```cypher
MATCH (u:User {id: $userId, tenantId: $tenantId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(o:Opportunity {tenantId: $tenantId})
RETURN o
```
This guarantees that shared `:Skill` nodes never leak cross-tenant connections.

---

## 4. Hybrid Database Data Schemas

### A. MongoDB (Mongoose)

#### 1. `Tenant` (`tenants` collection)
- **Fields**: `id` (UUID, unique index), `slug` (unique index), `name`, `status` (`active` | `suspended`), `allowed_email_domains` (`string[]`), `logo_url`, `contact_email`, `suspended_reason`.
- **Note**: Does not have a `tenantId` field; excluded from auto-scoping plugin.

#### 2. `UserAuth` (`user_auths` collection)
- **Fields**: `userId`, `tenantId` (indexed, null for `super_admin`), `email` (globally unique index), `password`, `role` (`alumni` | `student` | `partner` | `admin` | `moderator` | `super_admin`), `account_status`, `rejection_reason`.

#### 3. `Conversation` & `Message` (`conversations`, `messages` collections)
- **Conversation**: `tenantId` (indexed), `participants` (`string[]`), `lastMessage`, `clearedAt`.
- **Message**: `tenantId` (indexed), `conversationId`, `senderId`, `content`, `isRead`, `readAt`.
- Compound index: `{ tenantId: 1, participants: 1 }`.

#### 4. `Notification` (`notifications` collection)
- **Fields**: `tenantId` (indexed), `recipientId`, `message`, `type`, `is_read`, `sender_context`, `reference_link`.
- Compound index: `{ tenantId: 1, recipientId: 1 }`.

#### 5. `Announcement` (`announcements` collection)
- **Fields**: `tenantId` (indexed), `title`, `description`, `event_date`, `media_url`, `media_type`, `created_by_admin`.

#### 6. `Activity` (`activities` collection)
- **Fields**: `tenantId` (indexed), `type`, `description`, `related_id`, `created_at`.

---

### B. Neo4j Graph Model

#### Nodes & Indexes
Every tenant-owned node has an index on `tenantId`:
```cypher
CREATE INDEX user_tenant_idx IF NOT EXISTS FOR (u:User) ON (u.tenantId);
CREATE INDEX opportunity_tenant_idx IF NOT EXISTS FOR (o:Opportunity) ON (o.tenantId);
CREATE INDEX event_tenant_idx IF NOT EXISTS FOR (e:Event) ON (e.tenantId);
CREATE INDEX work_experience_tenant_idx IF NOT EXISTS FOR (w:WorkExperience) ON (w.tenantId);
CREATE INDEX education_tenant_idx IF NOT EXISTS FOR (e:Education) ON (e.tenantId);
```

#### Node Labels:
1. **User**: `id`, `tenantId`, `username`, `display_name`, `email`, `role`, `account_status`, `bio`, `profile_picture`, `degree`, `semester`, `batch`, `graduation_year`.
2. **Skill**: `id`, `name` (unique). Shared global taxonomy across all tenants.
3. **WorkExperience**: `id`, `tenantId`, `company_name`, `role`, `start_date`, `end_date`, `is_current`.
4. **Education**: `id`, `tenantId`, `university`, `degree`, `field_of_study`, `start_year`, `end_year`.
5. **Opportunity**: `id`, `tenantId`, `title`, `type`, `description`, `requirements`, `location`, `is_remote`, `deadline`, `status`.
6. **Event**: `id`, `tenantId`, `title`, `description`, `type`, `date`, `is_online`, `location`, `meeting_link`.

#### Relationships:
- `(:User {tenantId})-[:HAS_EXPERIENCE]->(:WorkExperience {tenantId})`
- `(:User {tenantId})-[:HAS_EDUCATION]->(:Education {tenantId})`
- `(:User {tenantId})-[:HAS_SKILL]->(:Skill)`
- `(:User {tenantId})-[:POSTED]->(:Opportunity {tenantId})`
- `(:Opportunity {tenantId})-[:REQUIRES_SKILL]->(:Skill)`
- `(:User {tenantId})-[:CREATED_EVENT]->(:Event {tenantId})`
- `(:User {tenantId})-[:CONNECTED_TO]->(:User {tenantId})`
- `(:User {tenantId})-[:FOLLOWS]->(:User {tenantId})`
- `(:User {tenantId})-[:BLOCKED]->(:User {tenantId})`

---

## 5. GraphQL Architecture

UNISON provides a code-first GraphQL API covering the entire platform (except WebSockets).

- **Endpoint**: `POST /graphql` (Playground enabled in development)
- **Authentication**: Uses `JwtAuthGuard`, `RolesGuard`, and `SuperAdminGuard` identical to REST. Passes `req.user` and populates CLS `tenantId`.
- **Auto-generated Schema**: Code-first TypeScript schema output to `src/schema.gql`.

### Resolver Map:
- **`TenantsResolver`**: Public queries for active universities (`tenants`, `tenant(slug)`).
- **`AuthResolver`**: `login`, `register`, `me`.
- **`ProfilesResolver`**: `userProfile`, `searchUsers`.
- **`OpportunityResolver`**: `opportunities`, `opportunity`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`.
- **`EventsResolver`**: `events`, `event`, `createEvent`, `deleteEvent`.
- **`AnnouncementsResolver`**: `announcements`, `announcement`, `broadcastAnnouncement`, `deleteAnnouncement`.
- **`AdminResolver`**: `adminDashboardStats`, `adminPendingAccounts`, `adminPendingUpgrades`, `adminCurrentTenant`, `adminApproveAccount`, `adminRejectAccount`, `adminApproveUpgrade`, `adminRejectUpgrade`, `adminUpdateTenant`, `adminCreateStaff`.
- **`SuperAdminResolver`**: `superAdminPlatformStats`, `superAdminTenants`, `superAdminTenant`, `superAdminCreateTenant`, `superAdminUpdateTenant`, `superAdminSuspendTenant`, `superAdminReactivateTenant`.

---

## 6. Realtime Partitioning (WebSockets)

Socket connections (`NotificationGateway`) verify tenant status during handshake:
1. Validates JWT and extracts `payload.tenantId`.
2. Validates tenant is active (rejects connection if suspended).
3. Client joins room: `tenant:{tenantId}` (for university-wide announcements/events) and `tenant:{tenantId}:user:{userId}` (for direct messages and notifications).
4. No global broadcast emits (`server.emit`) exist; all events emit to scoped rooms (`server.to('tenant:...')`).
