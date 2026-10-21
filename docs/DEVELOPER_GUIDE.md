# 🚀 UNISON Developer Playbook: Fast Feature Extension & Codebase Map

> **Purpose**: This guide provides token-dense, step-by-step recipes to add or update features in the UNISON codebase with **minimal token consumption**, **zero architectural drift**, and **guaranteed compilation**.

---

## 1. Quick Directory & Architecture Cheat-Sheet

```
src/
├── tenants/              # Multi-tenant root (Universities: branding, allowed domains, status)
├── super-admin/          # Platform-wide management (Stats, Onboarding tenants, Suspensions)
├── auth/                 # Authentication (JWT, OTP, Registration, UserAuth model)
├── admin/                # University Staff (Pending accounts, Staff creation, Announcements)
├── profiles/             # User profile lookups & recommendations (Neo4j graph)
├── profile-management/   # Role-neutral profile editing (Work experience, Education, Bio)
├── opportunity/          # Jobs, internships, projects (Neo4j graph)
├── events/               # University events, RSVPs, attendees (Neo4j graph)
├── connections/          # Social graph (Requests, follows, blocks, followers)
├── search/               # Full-text Neo4j search (Users & Opportunities)
├── network/              # Network science algorithms (Degree centrality, shortest path, trends)
├── chat/                 # 1-on-1 messaging (MongoDB Conversation + Message, Socket.io)
├── notification/         # Alerts & push notifications (MongoDB Notification, Socket.io)
├── common/
│   ├── plugins/          # tenant-scope.plugin.ts (Automatic Mongoose scoping)
│   ├── guards/           # jwt-auth, roles, super-admin, tenant-context, post-rate-limit
│   ├── decorators/       # get-user (@GetUser), roles (@Roles)
│   ├── activity/         # Activity logging schema & service
│   └── mail/             # BullMQ transactional email processor
├── neo4j/                # TenantNeo4jService (Scoped Cypher runner), Neo4jService
└── graphql/              # Code-first GraphQL (/graphql)
    ├── app-graphql.module.ts
    ├── types/graphql.types.ts
    └── resolvers/        # tenants, auth, profiles, opportunity, events, announcements, admin, super-admin
```

---

## 2. The Dual-Database Rule of Thumb

| Question | Storage Engine | Location |
| :--- | :--- | :--- |
| Is it credentials, account status, soft-delete state? | **MongoDB** | `src/auth/schemas/user-auth.schema.ts` |
| Is it chat messages or conversations? | **MongoDB** | `src/chat/schemas/` |
| Is it in-app notifications or audit logs? | **MongoDB** | `src/notification/schemas/`, `src/common/activity/` |
| Is it official university announcements? | **MongoDB** | `src/admin/schemas/announcement.schema.ts` |
| Is it university metadata, branding, domains? | **MongoDB** | `src/tenants/schemas/tenant.schema.ts` |
| Is it a user profile, student/alumni details? | **Neo4j** | `(:User { id, tenantId, ... })` |
| Is it a job/internship opportunity? | **Neo4j** | `(:Opportunity { id, tenantId, ... })` |
| Is it an event or RSVP? | **Neo4j** | `(:Event { id, tenantId, ... })` |
| Is it a relationship (friend, follower, block)?| **Neo4j** | `[:CONNECTED_TO]`, `[:FOLLOWS]`, `[:BLOCKED]` |
| Is it a skill or taxonomy tag? | **Neo4j** | Global shared `(:Skill { name })` |

---

## 3. Playbook A: Adding a New MongoDB Entity

When you create a new tenant-scoped MongoDB collection:

### Step 1: Define Schema with `tenantId`
```typescript
// src/<domain>/schemas/my-entity.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MyEntity extends Document {
  @Prop({ type: String, required: true, index: true })
  tenantId: string; // REQUIRED for automatic tenant-scoping plugin!

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  owner_id: string;
}

export const MyEntitySchema = SchemaFactory.createForClass(MyEntity);
```

### Step 2: Register in Module
```typescript
// src/<domain>/my-domain.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([{ name: MyEntity.name, schema: MyEntitySchema }]),
  ],
  providers: [MyDomainService],
  controllers: [MyDomainController],
})
export class MyDomainModule {}
```

### Step 3: Query & Mutate (Plugin Handles Isolation)
Inside your service, queries automatically filter by `{ tenantId: cls.get('tenantId') }`:
```typescript
@Injectable()
export class MyDomainService {
  constructor(@InjectModel(MyEntity.name) private model: Model<MyEntity>) {}

  // Automatically scoped to active tenant:
  async findAll() {
    return this.model.find(); // WHERE tenantId = $activeTenantId
  }

  // Automatically stamps tenantId on creation:
  async create(title: string, userId: string) {
    return this.model.create({ title, owner_id: userId });
  }

  // Explicit opt-out (ONLY for platform maintenance or pre-auth):
  async findGlobal(id: string) {
    return this.model.findById(id, null, { skipTenantScope: true } as any);
  }
}
```

---

## 4. Playbook B: Adding a New Neo4j Entity / Cypher Query

When querying or creating nodes in Neo4j:

### Step 1: Use `TenantNeo4jService`
Always inject `TenantNeo4jService` (not raw `Neo4jService`).
```typescript
@Injectable()
export class ProjectService {
  constructor(private readonly tenantNeo4j: TenantNeo4jService) {}

  async createProject(userId: string, data: CreateProjectDto) {
    const id = uuidv4();
    await this.tenantNeo4j.run(
      `
      MATCH (u:User { id: $userId, tenantId: $tenantId })
      CREATE (p:Project {
        id: $id,
        tenantId: $tenantId,
        title: $title,
        created_at: datetime()
      })
      CREATE (u)-[:OWNS_PROJECT]->(p)
      RETURN p.id as id
      `,
      { userId, id, title: data.title },
    );
    return { id, message: 'Project created' };
  }
}
```

### Step 2: Avoid Shared-Node Bridges (Crucial!)
If traversing through global shared nodes like `:Skill`, **always** scope the far end:
```cypher
// CORRECT: Both endpoints constrained to $tenantId
MATCH (u:User { id: $userId, tenantId: $tenantId })-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(peer:User { tenantId: $tenantId })
RETURN peer

// INCORRECT (LEAKS DATA TO OTHER UNIVERSITIES):
// MATCH (u:User { id: $userId, tenantId: $tenantId })-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(peer:User)
```

---

## 5. Playbook C: Adding a New REST Endpoint

Follow this template for any new REST API route:

```typescript
// src/<domain>/<domain>.controller.ts
@ApiTags('My Domain')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('my-domain')
export class MyDomainController {
  constructor(private readonly service: MyDomainService) {}

  @Post()
  @Roles('alumni', 'student', 'admin') // Role restrictions
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiResponse({ status: 201, type: ResourceResponseDto })
  async createResource(
    @GetUser() user: any,               // Injected by @GetUser() (user.sub, user.role, user.tenantId)
    @Body() dto: CreateResourceDto,     // Validated with class-validator
  ) {
    return this.service.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource details' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 404, description: 'Resource not found' }) // Always 404 for cross-tenant!
  async getResource(@Param('id') id: string) {
    const item = await this.service.findById(id);
    if (!item) {
      throw new NotFoundException('Resource not found'); // NEVER 403 for missing cross-tenant data
    }
    return item;
  }
}
```

---

## 6. Playbook D: Adding a New GraphQL Query or Mutation

To expose a feature on GraphQL (`/graphql`):

### Step 1: Add ObjectType / InputType in `src/graphql/types/graphql.types.ts`
```typescript
@ObjectType('Project')
export class ProjectType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => String, { nullable: true })
  created_at?: string;
}

@InputType('CreateProjectInput')
export class CreateProjectInput {
  @Field()
  title: string;
}
```

### Step 2: Add Method to Resolver
```typescript
// src/graphql/resolvers/<domain>.resolver.ts
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectResolver {
  constructor(private readonly service: ProjectService) {}

  @Query(() => [ProjectType], { name: 'projects', description: 'List tenant projects' })
  async getProjects(): Promise<ProjectType[]> {
    return this.service.findAll();
  }

  @Mutation(() => SuccessMessageType, { name: 'createProject', description: 'Create a project' })
  @Roles('admin', 'alumni')
  async createProject(
    @GetUser() user: any,
    @Args('input') input: CreateProjectInput,
  ): Promise<SuccessMessageType> {
    const res = await this.service.create(user.sub, input);
    return { message: 'Project created successfully', id: res.id };
  }
}
```

---

## 7. Guards & Security Quick Reference

| Decorator / Guard | Usage | Effect |
| :--- | :--- | :--- |
| `@UseGuards(JwtAuthGuard)` | Controller or Route | Requires valid `Bearer JWT`. Rejects missing/expired token (401). |
| `@UseGuards(JwtAuthGuard, RolesGuard)` | Controller or Route | Enforces `@Roles(...)`. Blocks `super_admin` from tenant routes. |
| `@Roles('admin', 'alumni')` | Method / Controller | Restricts route to specific roles. |
| `@UseGuards(SuperAdminGuard)`| Route | Restricts exclusively to platform `super_admin`. |
| `@GetUser()` | Parameter decorator | Extracts `{ sub: userId, role: userRole, tenantId: tenantId }`. Works in **both REST and GraphQL**. |

---

## 8. Development & Verification Workflow

```bash
# 1. Run build to verify TypeScript compilation (Must have 0 errors)
npm run build

# 2. Run fast linter check
npm run lint:check

# 3. Run cross-tenant isolation e2e tests
npm run test:e2e

# 4. Start local development server
npm run start:dev
```
