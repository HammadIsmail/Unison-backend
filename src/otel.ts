import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HostMetrics } from '@opentelemetry/host-metrics';

/**
 * Initializes OpenTelemetry Metrics and starts the periodic push to Grafana Cloud.
 *
 * Configured via environment variables:
 * - OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Your Grafana OTLP gateway URL
 * - OTEL_EXPORTER_OTLP_METRICS_HEADERS: Your Authorization header (Basic auth)
 */
export function setupMetrics() {
  let endpoint = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
  let headers = process.env.OTEL_EXPORTER_OTLP_METRICS_HEADERS;

  // Clean up any accidental quotes from Render dashboard
  if (endpoint) endpoint = endpoint.replace(/^["'](.+)["']$/, '$1');
  if (headers) headers = headers.replace(/^["'](.+)["']$/, '$1');

  if (!endpoint || !headers) {
    console.warn(
      '⚠️ OTEL metrics not configured. Missing ENDPOINT or HEADERS in env.',
    );
    console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.startsWith('OTEL')));
    return;
  }

  // Parse headers string "key1=val1,key2=val2" into an object
  const headerMap: Record<string, string> = {};
  headers.split(',').forEach((h) => {
    const parts = h.split('=');
    const key = parts[0];
    const value = parts.slice(1).join('='); // Ensure we capture values that might contain '='
    if (key && value) headerMap[key.trim()] = value.trim();
  });

  console.log('🔗 Connecting to OTLP Endpoint:', endpoint);
  console.log('🔑 Headers Configured:', Object.keys(headerMap));

  const exporter = new OTLPMetricExporter({
    url: endpoint,
    headers: headerMap,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: exporter,
    exportIntervalMillis: 60000, // Export every 60 seconds
  });

  const meterProvider = new MeterProvider({
    readers: [metricReader],
  });

  // Automatically track HTTP and Express route performance
  registerInstrumentations({
    meterProvider: meterProvider,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  // Track CPU, RAM, and process stats
  const hostMetrics = new HostMetrics({
    meterProvider: meterProvider,
    name: 'unison-host-metrics',
  });
  hostMetrics.start();

  console.log('🚀 OpenTelemetry Metrics initialized. Pushing to Grafana Cloud.');

  return meterProvider;
}
