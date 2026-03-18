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
exports.StudentService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const uuid_1 = require("uuid");
let StudentService = class StudentService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getProfile(id) {
        const result = await this.neo4j.run(`MATCH (u:User {id: $id, role: 'student'})
       OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
       RETURN u, collect(DISTINCT {id: s.id, name: s.name, category: s.category, proficiency_level: r.proficiency_level}) AS skills`, { id });
        if (!result.records.length) {
            throw new common_1.NotFoundException('Student profile not found.');
        }
        const record = result.records[0];
        const user = record.get('u').properties;
        const skills = record.get('skills').filter((s) => s.id !== null);
        return {
            name: user.name,
            email: user.email,
            roll_number: user.roll_number,
            semester: typeof user.semester?.toNumber === 'function' ? user.semester.toNumber() : user.semester,
            degree: user.degree,
            skills: skills.map((s) => s.name),
            detailed_skills: skills,
            batch: user.batch || null,
            bio: user.bio || null,
            phone: user.phone || null,
            profile_picture: user.profile_picture || null,
        };
    }
    async updateProfile(userId, dto) {
        const setQuery = Object.keys(dto)
            .filter((k) => dto[k] !== undefined)
            .map((k) => `u.${k} = $${k}`)
            .join(', ');
        if (!setQuery)
            return { message: 'No fields to update.' };
        await this.neo4j.run(`MATCH (u:User {id: $userId, role: 'student'}) SET ${setQuery} RETURN u`, { userId, ...dto });
        return { message: 'Profile updated successfully.' };
    }
    async addSkill(userId, dto) {
        const skillId = (0, uuid_1.v4)();
        await this.neo4j.run(`MATCH (u:User {id: $userId, role: 'student'})
       MERGE (s:Skill {name: toLower($dto.skill_name)})
       ON CREATE SET s.id = $skillId, s.category = $dto.category
       MERGE (u)-[r:HAS_SKILL]->(s)
       SET r.proficiency_level = $dto.proficiency_level`, { userId, skillId, dto });
        return { message: 'Skill added successfully.' };
    }
    async getMentors(userId) {
        const result = await this.neo4j.run(`MATCH (student:User {id: $userId, role: 'student'})-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(alumni:User {role: 'alumni', account_status: 'approved'})
       OPTIONAL MATCH (alumni)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN alumni.id AS alumni_id, 
              alumni.name AS name, 
              s.category AS domain, 
              w.company_name AS company,
              count(s) AS common_skills
       ORDER BY common_skills DESC
       LIMIT 10`, { userId });
        return result.records.map((r) => ({
            alumni_id: r.get('alumni_id'),
            name: r.get('name'),
            domain: r.get('domain'),
            company: r.get('company') || null,
        }));
    }
};
exports.StudentService = StudentService;
exports.StudentService = StudentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], StudentService);
//# sourceMappingURL=student.service.js.map