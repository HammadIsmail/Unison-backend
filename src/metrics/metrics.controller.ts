import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';
import { MetricsGuard } from './metrics.guard';

/**
 * Overrides the default PrometheusController to add bearer-token
 * protection on the /metrics endpoint via MetricsGuard.
 *
 * Grafana Cloud scraper must send:
 *   Authorization: Bearer <METRICS_TOKEN>
 *
 * Set METRICS_TOKEN in your Render environment variables.
 */
@Controller()
@UseGuards(MetricsGuard)
export class MetricsController extends PrometheusController {
  @Get('/metrics')
  async index(@Res({ passthrough: true }) response: Response): Promise<string> {
    return super.index(response);
  }
}
