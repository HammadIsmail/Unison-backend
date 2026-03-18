import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from '../../neo4j/neo4j.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        config: ConfigService,
        private neo4j: Neo4jService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('JWT_SECRET')!,
        });
    }

    async validate(payload: JwtPayload) {
        const result = await this.neo4j.run(
            'MATCH (u:User {id: $id, email: $email}) RETURN u',
            { id: payload.sub, email: payload.email },
        );
        if (!result.records.length) {
            throw new UnauthorizedException('User not found or token invalid.');
        }
        const user = result.records[0].get('u').properties;
        return { sub: user.id, email: user.email, role: user.role, name: user.name };
    }
}
