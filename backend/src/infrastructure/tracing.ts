import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const enabled = process.env.OTEL_ENABLED === 'true';
export const tracingSdk = enabled
  ? new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? '29-ai-workspace-api',
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      }),
      instrumentations: [
        new PrismaInstrumentation(),
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (request) =>
              request.url === '/health/live',
          },
        }),
      ],
    })
  : null;

tracingSdk?.start();
if (tracingSdk) process.once('SIGTERM', () => void tracingSdk.shutdown());
