import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import neo4j from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'NEO4J_DRIVER',
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const uri = config.get<string>('NEO4J_URI')!;
                const user = config.get<string>('NEO4J_USERNAME')!;
                const password = config.get<string>('NEO4J_PASSWORD')!
                return neo4j.driver(uri, neo4j.auth.basic(user, password));
            },
        },
        Neo4jService,
    ],
    exports: [Neo4jService],
})
export class Neo4jModule { }
