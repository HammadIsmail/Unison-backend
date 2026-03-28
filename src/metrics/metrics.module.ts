import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsGuard } from './metrics.guard';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsGuard,
    MetricsMiddleware,

    // ── HTTP request counter ──────────────────────────────────────────────
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),

    // ── HTTP request duration histogram ──────────────────────────────────
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),

    // ── Active in-flight requests gauge ──────────────────────────────────
    makeGaugeProvider({
      name: 'http_active_requests',
      help: 'Number of currently in-flight HTTP requests',
    }),
  ],
  exports: [
    MetricsGuard,
    MetricsMiddleware,
    // Export metric providers so MetricsMiddleware can inject them
    'PROM_METRIC_HTTP_REQUESTS_TOTAL',
    'PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS',
    'PROM_METRIC_HTTP_ACTIVE_REQUESTS',
  ],
})
export class MetricsModule {}
