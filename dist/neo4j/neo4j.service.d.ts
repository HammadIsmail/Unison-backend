import { Driver, Session, QueryResult } from 'neo4j-driver';
export declare class Neo4jService {
    private readonly driver;
    constructor(driver: Driver);
    getSession(): Session;
    run(cypher: string, params?: Record<string, any>): Promise<QueryResult>;
    onModuleDestroy(): Promise<void>;
}
