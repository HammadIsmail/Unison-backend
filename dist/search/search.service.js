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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let SearchService = class SearchService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async searchAlumni(name, company, skill, batch_year, degree) {
        let matchClause = `MATCH (u:User {role: 'alumni', account_status: 'approved'})`;
        const whereClauses = [];
        if (name)
            whereClauses.push(`toLower(u.name) CONTAINS toLower($name)`);
        if (batch_year)
            whereClauses.push(`u.graduation_year = toInteger($batch_year) OR u.batch CONTAINS $batch_year`);
        if (degree)
            whereClauses.push(`toLower(u.degree) CONTAINS toLower($degree)`);
        if (skill) {
            matchClause += ` MATCH (u)-[:HAS_SKILL]->(s:Skill)`;
            whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
        }
        else {
            matchClause += ` OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)`;
        }
        if (company) {
            matchClause += ` MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})`;
            whereClauses.push(`toLower(w.company_name) CONTAINS toLower($company)`);
        }
        else {
            matchClause += ` OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})`;
        }
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `
      ${matchClause}
      ${whereString}
      WITH u, w, collect(DISTINCT s.name) AS skills
      RETURN u.id AS id, u.name AS name, w.company_name AS company, w.role AS role, skills
      ORDER BY u.created_at DESC
      LIMIT 50
    `;
        const result = await this.neo4j.run(query, { name, company, skill, batch_year, degree });
        return result.records.map((r) => ({
            id: r.get('id'),
            name: r.get('name'),
            company: r.get('company') || null,
            role: r.get('role') || null,
            skills: r.get('skills'),
        }));
    }
    async searchOpportunities(title, type, skill, location, is_remote) {
        let matchClause = `MATCH (o:Opportunity)<-[:POSTED]-(u:User)`;
        const whereClauses = [];
        if (title)
            whereClauses.push(`toLower(o.title) CONTAINS toLower($title)`);
        if (type)
            whereClauses.push(`o.type = $type`);
        if (location)
            whereClauses.push(`toLower(o.location) CONTAINS toLower($location)`);
        if (is_remote !== undefined)
            whereClauses.push(`o.is_remote = $is_remote_bool`);
        if (skill) {
            matchClause += ` MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)`;
            whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
        }
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `
      ${matchClause}
      ${whereString}
      RETURN o.id AS id, o.title AS title, o.type AS type, o.company_name AS company,
             o.location AS location, o.apply_link AS apply_link
      ORDER BY o.posted_at DESC
      LIMIT 50
    `;
        const result = await this.neo4j.run(query, {
            title, type, skill, location, is_remote_bool: is_remote === 'true'
        });
        return result.records.map((r) => ({
            id: r.get('id'),
            title: r.get('title'),
            type: r.get('type'),
            company: r.get('company'),
            location: r.get('location'),
            apply_link: r.get('apply_link'),
        }));
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SearchService);
//# sourceMappingURL=search.service.js.map