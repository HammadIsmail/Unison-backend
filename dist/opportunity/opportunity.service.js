"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const uuid_1 = require("uuid");
let OpportunityService = class OpportunityService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async create(userId, dto) {
        const opportunityId = (0, uuid_1.v4)();
        await this.neo4j.run(`MATCH (u:User {id: $userId})
       CREATE (o:Opportunity {
         id: $opportunityId,
         title: $dto.title,
         type: $dto.type,
         description: $dto.description,
         requirements: $dto.requirements,
         location: $dto.location,
         is_remote: $dto.is_remote,
         deadline: $dto.deadline,
         company_name: $dto.company_name,
         apply_link: $dto.apply_link,
         status: 'open',
         posted_at: date()
       })
       CREATE (u)-[:POSTED]->(o)
       WITH o
       UNWIND $dto.required_skills AS skillName
       MERGE (s:Skill {name: toLower(skillName)})
       ON CREATE SET s.id = randomUUID()
       MERGE (o)-[:REQUIRES_SKILL]->(s)`, { userId, opportunityId, dto });
        return { message: 'Opportunity broadcasted to network successfully.', opportunity_id: opportunityId };
    }
    async findAll(page = 1, limit = 10, type, skill, is_remote) {
        const skip = (page - 1) * limit;
        let matchClause = `MATCH (o:Opportunity)<-[:POSTED]-(u:User)`;
        let whereClauses = [];
        if (type)
            whereClauses.push(`o.type = $type`);
        if (is_remote !== undefined)
            whereClauses.push(`o.is_remote = $is_remote_bool`);
        if (skill) {
            matchClause += ` MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)`;
            whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
        }
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countQuery = `${matchClause} ${whereString} RETURN count(DISTINCT o) AS total`;
        const countResult = await this.neo4j.run(countQuery, { type, is_remote_bool: is_remote === 'true', skill });
        const total = countResult.records[0]?.get('total').toNumber() || 0;
        const query = `
      ${matchClause}
      ${whereString}
      RETURN o.id AS id, o.title AS title, o.type AS type, o.company_name AS company, 
             o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
             o.deadline AS deadline, o.posted_at AS posted_at, u.name AS posted_by
      ORDER BY o.posted_at DESC
      SKIP toInteger($skip) LIMIT toInteger($limit)
    `;
        const result = await this.neo4j.run(query, { type, is_remote_bool: is_remote === 'true', skill, skip, limit });
        const data = result.records.map((r) => ({
            id: r.get('id'),
            title: r.get('title'),
            type: r.get('type'),
            company: r.get('company'),
            location: r.get('location'),
            is_remote: r.get('is_remote'),
            apply_link: r.get('apply_link'),
            posted_by: r.get('posted_by'),
            posted_at: r.get('posted_at'),
            deadline: r.get('deadline'),
        }));
        return { total, page, data };
    }
    async findOne(id) {
        const result = await this.neo4j.run(`MATCH (o:Opportunity {id: $id})<-[:POSTED]-(u:User)
       OPTIONAL MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)
       RETURN o, u.id AS poster_id, u.name AS poster_name, u.role AS poster_role, collect(s.name) AS required_skills`, { id });
        if (!result.records.length)
            throw new common_1.NotFoundException('Opportunity not found.');
        const r = result.records[0];
        const opp = r.get('o').properties;
        return {
            id: opp.id,
            title: opp.title,
            type: opp.type,
            description: opp.description,
            requirements: opp.requirements,
            location: opp.location,
            is_remote: opp.is_remote,
            apply_link: opp.apply_link,
            deadline: opp.deadline,
            company: {
                name: opp.company_name,
            },
            required_skills: r.get('required_skills'),
            posted_by: {
                id: r.get('poster_id'),
                name: r.get('poster_name'),
                role: r.get('poster_role'),
            }
        };
    }
    async findMyPosts(userId) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $userId})-[:POSTED]->(o:Opportunity)
       RETURN o.id AS id, o.title AS title, o.company_name AS company, 
              o.status AS status, o.posted_at AS posted_at, o.deadline AS deadline
       ORDER BY o.posted_at DESC`, { userId });
        return result.records.map((r) => ({
            id: r.get('id'),
            title: r.get('title'),
            company: r.get('company'),
            status: r.get('status'),
            posted_at: r.get('posted_at'),
            deadline: r.get('deadline'),
        }));
    }
    async update(userId, userRole, id, dto) {
        const oppResult = await this.neo4j.run(`MATCH (u:User)-[:POSTED]->(o:Opportunity {id: $id}) RETURN u.id AS poster_id`, { id });
        if (!oppResult.records.length)
            throw new common_1.NotFoundException('Opportunity not found.');
        const posterId = oppResult.records[0].get('poster_id');
        if (userId !== posterId && userRole !== 'admin') {
            throw new common_1.ForbiddenException('Only the poster or an admin can update this opportunity.');
        }
        const setQuery = Object.keys(dto)
            .filter((k) => dto[k] !== undefined)
            .map((k) => `o.${k} = $${k}`)
            .join(', ');
        if (!setQuery)
            return { message: 'No fields to update.' };
        await this.neo4j.run(`MATCH (o:Opportunity {id: $id}) SET ${setQuery} RETURN o`, { id, ...dto });
        return { message: 'Opportunity updated successfully.' };
    }
    async remove(userId, userRole, id) {
        const oppResult = await this.neo4j.run(`MATCH (u:User)-[:POSTED]->(o:Opportunity {id: $id}) RETURN u.id AS poster_id`, { id });
        if (!oppResult.records.length)
            throw new common_1.NotFoundException('Opportunity not found.');
        const posterId = oppResult.records[0].get('poster_id');
        if (userId !== posterId && userRole !== 'admin') {
            throw new common_1.ForbiddenException('Only the poster or an admin can delete this opportunity.');
        }
        await this.neo4j.run(`MATCH (o:Opportunity {id: $id}) DETACH DELETE o`, { id });
        return { message: 'Opportunity removed successfully.' };
    }
};
exports.OpportunityService = OpportunityService;
exports.OpportunityService = OpportunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], OpportunityService);
//# sourceMappingURL=opportunity.service.js.map