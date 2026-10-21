import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { TenantNeo4jService } from '../../neo4j/tenant-neo4j.service';

@Injectable()
export class PostRateLimitGuard implements CanActivate {
  constructor(private readonly neo4j: TenantNeo4jService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Let AuthGuard handle unauthenticated requests
    if (!user || !user.sub) return true; 

    const userId = user.sub;

    // 1. Check if user is currently locked
    const lockCheckQuery = `
      MATCH (u:User {id: $userId, tenantId: $tenantId})
      RETURN u.posting_locked_until AS locked_until
    `;
    const lockRes = await this.neo4j.run(lockCheckQuery, { userId });
    
    if (lockRes.records.length > 0) {
      const lockedUntilStr = lockRes.records[0].get('locked_until');
      if (lockedUntilStr) {
        const dateStr = typeof lockedUntilStr === 'string' ? lockedUntilStr : lockedUntilStr.toString();
        const lockedUntil = new Date(dateStr);
        
        if (lockedUntil > new Date()) {
          const secondsLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
          throw new HttpException(
            {
              message: 'You have been temporarily blocked from posting due to too many recent posts.',
              retry_after_seconds: secondsLeft,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // 2. Count recent posts (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const countQuery = `
      MATCH (u:User {id: $userId, tenantId: $tenantId})
      CALL {
        WITH u
        MATCH (u)-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
        WHERE o.posted_at >= $tenMinutesAgo
        RETURN count(o) AS opps
      }
      CALL {
        WITH u
        MATCH (u)-[:CREATED_EVENT]->(e:Event {tenantId: $tenantId})
        WHERE e.created_at >= datetime($tenMinutesAgo)
        RETURN count(e) AS evts
      }
      RETURN opps + evts AS total_recent
    `;
    
    const countRes = await this.neo4j.run(countQuery, { userId, tenMinutesAgo });
    
    if (countRes.records.length > 0) {
      const totalRecentVal = countRes.records[0].get('total_recent');
      const totalRecent = typeof totalRecentVal.toNumber === 'function' ? totalRecentVal.toNumber() : Number(totalRecentVal);
      
      if (totalRecent >= 5) {
        const lockDurationMinutes = 5;
        const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString();
        
        await this.neo4j.run(`
          MATCH (u:User {id: $userId, tenantId: $tenantId})
          SET u.posting_locked_until = $lockedUntil
        `, { userId, lockedUntil });
        
        throw new HttpException(
          {
            message: 'You have been temporarily blocked from posting due to too many recent posts.',
            retry_after_seconds: lockDurationMinutes * 60,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
