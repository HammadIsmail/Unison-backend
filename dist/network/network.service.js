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
exports.NetworkService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let NetworkService = class NetworkService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getCentrality() {
        const query = `
      MATCH (u:User {role: 'alumni', account_status: 'approved'})
      OPTIONAL MATCH (u)-[:CONNECTED_TO]-(c:User)
      WITH u, count(c) AS connections
      RETURN u.id AS alumni_id, u.name AS name, connections, 
             toFloat(connections) / 100.0 AS centrality_score
      ORDER BY connections DESC
      LIMIT 10
    `;
        const result = await this.neo4j.run(query);
        return result.records.map(r => ({
            alumni_id: r.get('alumni_id'),
            name: r.get('name'),
            connections: r.get('connections').toNumber(),
            centrality_score: r.get('centrality_score'),
        }));
    }
    async getShortestPath(fromId, toId) {
        const query = `
      MATCH (u1:User {id: $fromId}), (u2:User {id: $toId})
      MATCH p = shortestPath((u1)-[:CONNECTED_TO*]-(u2))
      RETURN [n in nodes(p) | n.name] AS path, length(p) AS hops
    `;
        const result = await this.neo4j.run(query, { fromId, toId });
        if (!result.records.length)
            return { path: [], hops: 0 };
        return {
            path: result.records[0].get('path'),
            hops: result.records[0].get('hops').toNumber(),
        };
    }
    async getTopCompanies() {
        const query = `
      MATCH (w:WorkExperience)
      RETURN w.company_name AS company, count(DISTINCT w) AS alumni_count
      ORDER BY alumni_count DESC
      LIMIT 10
    `;
        const result = await this.neo4j.run(query);
        return result.records.map(r => ({
            company: r.get('company'),
            alumni_count: r.get('alumni_count').toNumber(),
        }));
    }
    async getSkillTrends() {
        const query = `
      MATCH (o:Opportunity)-[:REQUIRES_SKILL]->(s:Skill)
      WITH s.name AS skill, count(o) AS demand
      ORDER BY demand DESC
      WITH collect({skill: skill, demand: demand}) AS demanded
      
      MATCH (u:User)-[:HAS_SKILL]->(s2:Skill)
      WITH demanded, s2.name AS user_skill, count(u) AS supply
      ORDER BY supply DESC
      WITH demanded, collect({skill: user_skill, supply: supply}) AS supplied
      
      RETURN [d in demanded | d.skill][..5] AS most_required_in_opportunities,
             [s in supplied | s.skill][..5] AS most_common_among_alumni,
             [d in demanded WHERE NOT d.skill IN [s in supplied | s.skill]][..5] AS gap
    `;
        const result = await this.neo4j.run(query);
        if (!result.records.length)
            return { most_required_in_opportunities: [], most_common_among_alumni: [], gap: [] };
        return {
            most_required_in_opportunities: result.records[0].get('most_required_in_opportunities'),
            most_common_among_alumni: result.records[0].get('most_common_among_alumni'),
            gap: result.records[0].get('gap'),
        };
    }
    async getBatchAnalysis() {
        const query = `
      MATCH (u:User {role: 'alumni'})
      OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
      OPTIONAL MATCH (u)-[:CONNECTED_TO]-(c:User)
      WITH u.batch AS batch, count(u) AS total_alumni, collect(DISTINCT w.company_name) AS companies, 
           collect(DISTINCT w.role) AS roles, avg(size((u)-[:CONNECTED_TO]-())) AS avg_conns
      RETURN batch, total_alumni, companies[..2] AS top_companies, roles[..2] AS top_roles, 
             toInt(avg_conns) AS avg_connections
      ORDER BY batch DESC
    `;
        const result = await this.neo4j.run(query);
        return result.records.map(r => ({
            batch: r.get('batch'),
            total_alumni: r.get('total_alumni').toNumber(),
            top_companies: r.get('top_companies'),
            top_roles: r.get('top_roles'),
            avg_connections: r.get('avg_connections'),
        }));
    }
};
exports.NetworkService = NetworkService;
exports.NetworkService = NetworkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], NetworkService);
//# sourceMappingURL=network.service.js.map