import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,

    @InjectMetric('http_active_requests')
    private readonly activeRequests: Gauge<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Ignore the /metrics endpoint itself to avoid self-referential noise
    if (req.path === '/metrics') {
      return next();
    }

    const startTime = process.hrtime.bigint();
    this.activeRequests.inc();

    res.on('finish', () => {
      const durationNs = Number(process.hrtime.bigint() - startTime);
      const durationSec = durationNs / 1e9;

      // Normalize dynamic segments: /api/users/123 → /api/users/:id
      const route = req.route?.path ?? req.path;
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      this.requestCounter.inc(labels);
      this.requestDuration.observe(labels, durationSec);
      this.activeRequests.dec();
    });

    next();
  }
}
