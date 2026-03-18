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
exports.AlumniService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const uuid_1 = require("uuid");
let AlumniService = class AlumniService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getProfile(id) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $id, role: 'alumni'})
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
       OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
       OPTIONAL MATCH (u)-[:CONNECTED_TO {status: 'accepted'}]-(c:User)
       RETURN u, collect(DISTINCT w) AS experiences, 
              collect(DISTINCT {id: s.id, name: s.name, category: s.category, proficiency_level: r.proficiency_level}) AS skills, 
              count(DISTINCT c) AS connections_count`, { id });
        if (!result.records.length) {
            throw new common_1.NotFoundException('Alumni profile not found.');
        }
        const record = result.records[0];
        const user = record.get('u').properties;
        const experiences = record.get('experiences').map((node) => node.properties);
        const skills = record.get('skills').filter((s) => s.id !== null);
        const connections_count = record.get('connections_count').toNumber();
        return {
            name: user.name,
            email: user.email,
            bio: user.bio,
            graduation_year: typeof user.graduation_year?.toNumber === 'function' ? user.graduation_year.toNumber() : user.graduation_year,
            degree: user.degree,
            current_company: experiences.find((e) => e.is_current)?.company_name || null,
            role: experiences.find((e) => e.is_current)?.role || null,
            skills: skills.map((s) => s.name),
            batch: user.batch,
            connections_count,
            linkedin_url: user.linkedin_url || null,
            work_experiences: experiences,
            detailed_skills: skills,
        };
    }
    async updateProfile(userId, dto) {
        const setQuery = Object.keys(dto)
            .filter((k) => dto[k] !== undefined)
            .map((k) => `u.${k} = $${k}`)
            .join(', ');
        if (!setQuery)
            return { message: 'No fields to update.' };
        await this.neo4j.run(`MATCH (u:User {id: $userId, role: 'alumni'}) SET ${setQuery} RETURN u`, { userId, ...dto });
        return { message: 'Profile updated successfully.' };
    }
    async addWorkExperience(userId, dto) {
        const expId = (0, uuid_1.v4)();
        await this.neo4j.run(`MATCH (u:User {id: $userId})
       CREATE (w:WorkExperience {
         id: $expId,
         company_name: $dto.company_name,
         role: $dto.role,
         start_date: $dto.start_date,
         end_date: $dto.end_date,
         is_current: $dto.is_current,
         employment_type: $dto.employment_type
       })
       CREATE (u)-[:HAS_EXPERIENCE]->(w)`, { userId, expId, dto });
        return { message: 'Work experience added successfully.' };
    }
    async updateWorkExperience(userId, expId, dto) {
        const setQuery = Object.keys(dto)
            .filter((k) => dto[k] !== undefined)
            .map((k) => `w.${k} = $${k}`)
            .join(', ');
        if (!setQuery)
            return { message: 'No fields to update.' };
        const result = await this.neo4j.run(`MATCH (u:User {id: $userId})-[:HAS_EXPERIENCE]->(w:WorkExperience {id: $expId})
       SET ${setQuery} RETURN w`, { userId, expId, ...dto });
        if (!result.records.length)
            throw new common_1.NotFoundException('Work experience not found.');
        return { message: 'Work experience updated successfully.' };
    }
    async deleteWorkExperience(userId, expId) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $userId})-[:HAS_EXPERIENCE]->(w:WorkExperience {id: $expId})
       DETACH DELETE w RETURN count(w) AS cnt`, { userId, expId });
        if (result.records[0].get('cnt').toNumber() === 0) {
            throw new common_1.NotFoundException('Work experience not found.');
        }
        return { message: 'Work experience removed successfully.' };
    }
    async addSkill(userId, dto) {
        const skillId = (0, uuid_1.v4)();
        await this.neo4j.run(`MATCH (u:User {id: $userId})
       MERGE (s:Skill {name: toLower($dto.skill_name)})
       ON CREATE SET s.id = $skillId, s.category = $dto.category
       MERGE (u)-[r:HAS_SKILL]->(s)
       SET r.proficiency_level = $dto.proficiency_level, r.years_experience = $dto.years_experience`, { userId, skillId, dto });
        return { message: 'Skill added successfully.' };
    }
    async deleteSkill(userId, skillId) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       DELETE r RETURN count(r) AS cnt`, { userId, skillId });
        if (result.records[0].get('cnt').toNumber() === 0) {
            throw new common_1.NotFoundException('Skill not found in local profile.');
        }
        await this.neo4j.run(`MATCH (s:Skill) WHERE NOT ()-[:HAS_SKILL]->(s) DELETE s`);
        return { message: 'Skill removed successfully.' };
    }
    async getNetwork(userId) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User)
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.name AS name, w.company_name AS company, w.role AS role, r.connection_type AS connection_type`, { userId });
        return result.records.map((r) => ({
            id: r.get('id'),
            name: r.get('name'),
            company: r.get('company') || null,
            role: r.get('role') || null,
            connection_type: r.get('connection_type') || null,
        }));
    }
    async connectWith(userId, targetId, dto) {
        if (userId === targetId)
            throw new common_1.ForbiddenException('Cannot connect with yourself.');
        const check = await this.neo4j.run(`MATCH (t:User {id: $targetId}) RETURN t`, { targetId });
        if (!check.records.length)
            throw new common_1.NotFoundException('Target user not found.');
        await this.neo4j.run(`MATCH (u:User {id: $userId}), (t:User {id: $targetId})
       MERGE (u)-[r:CONNECTED_TO]->(t)
       ON CREATE SET r.status = 'pending', r.created_at = datetime(), r.connection_type = $dto.connection_type
       ON MATCH SET r.connection_type = $dto.connection_type`, { userId, targetId, dto });
        return { message: 'Connection request sent successfully.' };
    }
    async getPendingRequests(userId) {
        const result = await this.neo4j.run(`MATCH (u:User)-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
       RETURN u.id AS id, u.name AS name, r.connection_type AS connection_type, r.created_at AS created_at`, { userId });
        return result.records.map((r) => ({
            sender_id: r.get('id'),
            sender_name: r.get('name'),
            connection_type: r.get('connection_type'),
            requested_at: r.get('created_at'),
        }));
    }
    async respondToRequest(userId, senderId, action) {
        if (action === 'accept') {
            const result = await this.neo4j.run(`MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         SET r.status = 'accepted', r.accepted_at = datetime()
         RETURN r`, { userId, senderId });
            if (!result.records.length)
                throw new common_1.NotFoundException('Connection request not found.');
            return { message: 'Connection request accepted.' };
        }
        else {
            const result = await this.neo4j.run(`MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         DELETE r RETURN count(r) AS cnt`, { userId, senderId });
            if (result.records[0].get('cnt').toNumber() === 0)
                throw new common_1.NotFoundException('Connection request not found.');
            return { message: 'Connection request rejected.' };
        }
    }
    async getBatchMates(userId) {
        const userResult = await this.neo4j.run(`MATCH (u:User {id: $userId}) RETURN u.batch AS batch`, { userId });
        if (!userResult.records.length)
            throw new common_1.NotFoundException('User not found.');
        const batch = userResult.records[0].get('batch');
        if (!batch)
            return [];
        const result = await this.neo4j.run(`MATCH (c:User {batch: $batch, role: 'alumni'})
       WHERE c.id <> $userId AND c.account_status = 'approved'
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.name AS name, w.company_name AS company, w.role AS role`, { batch, userId });
        return result.records.map((r) => ({
            id: r.get('id'),
            name: r.get('name'),
            company: r.get('company') || null,
            role: r.get('role') || null,
        }));
    }
};
exports.AlumniService = AlumniService;
exports.AlumniService = AlumniService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], AlumniService);
//# sourceMappingURL=alumni.service.js.map