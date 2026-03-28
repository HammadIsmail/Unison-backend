import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protects the /metrics endpoint from public access.
 *
 * Grafana Cloud (or any scraper) must include the token in the
 * Authorization header:
 *   Authorization: Bearer <METRICS_TOKEN>
 *
 * Set METRICS_TOKEN in your Render environment variables.
 */
@Injectable()
export class MetricsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing metrics token');
    }

    const token = authHeader.split(' ')[1];
    const expected = this.config.get<string>('METRICS_TOKEN');

    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid metrics token');
    }

    return true;
  }
}
