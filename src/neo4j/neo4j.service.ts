import { Injectable, Inject, Logger } from '@nestjs/common';
import { Driver, Session, QueryResult } from 'neo4j-driver';

@Injectable()
export class Neo4jService {
    private readonly logger = new Logger(Neo4jService.name);

    constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) { }

    getSession(): Session {
        return this.driver.session();
    }

    async run(cypher: string, params: Record<string, any> = {}): Promise<QueryResult> {
        let session: Session;
        try {
            session = this.getSession();
        } catch (err: any) {
            this.logger.warn(`Neo4j getSession failed: ${err?.message || err}`);
            return { records: [], summary: {} } as any;
        }

        try {
            return await session.run(cypher, params);
        } catch (err: any) {
            this.logger.warn(
                `Neo4j query unreachable (${err?.code || err?.message || 'Offline'}). Returning empty fallback records.`,
            );
            return { records: [], summary: {} } as any;
        } finally {
            try {
                await session.close();
            } catch {
                // ignore close errors if session failed to establish
            }
        }
    }

    async onModuleDestroy() {
        try {
            await this.driver.close();
        } catch {}
    }
}
