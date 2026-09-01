const enabled = process.env.OTEL_ENABLED === 'true';

export let tracingSdk: any = null;

if (enabled) {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    let prismaInst: any = null;
    try {
      const { PrismaInstrumentation } = require('@prisma/instrumentation');
      prismaInst = new PrismaInstrumentation();
    } catch {
      // Optional instrumentation
    }

    tracingSdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? '29-ai-workspace-api',
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      }),
      instrumentations: [
        ...(prismaInst ? [prismaInst] : []),
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (request: any) =>
              request.url === '/health/live',
          },
        }),
      ],
    });

    tracingSdk?.start();
    process.once('SIGTERM', () => void tracingSdk?.shutdown());
  } catch (err) {
    console.warn('[Tracing] OpenTelemetry initialization skipped:', err);
  }
}
