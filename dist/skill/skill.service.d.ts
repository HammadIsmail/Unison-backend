import { Neo4jService } from '../neo4j/neo4j.service';
export declare class SkillService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    findAll(): Promise<any[]>;
}
