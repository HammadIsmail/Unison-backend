import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from '../../neo4j/neo4j.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private neo4j;
    constructor(config: ConfigService, neo4j: Neo4jService);
    validate(payload: JwtPayload): Promise<{
        sub: any;
        email: any;
        role: any;
        name: any;
    }>;
}
export {};
