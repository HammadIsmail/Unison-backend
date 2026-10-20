import { Injectable, Inject } from '@nestjs/common';
import { Driver, Session, QueryResult } from 'neo4j-driver';

@Injectable()
export class Neo4jService {
    constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) { }

    getSession(): Session {
        return this.driver.session();
    }

    async run(cypher: string, params: Record<string, any> = {}): Promise<QueryResult> {
        const session = this.getSession();
        try {
            return await session.run(cypher, params);
        } finally {
            await session.close();
        }
    }

    async onModuleDestroy() {
        await this.driver.close();
    }
}
