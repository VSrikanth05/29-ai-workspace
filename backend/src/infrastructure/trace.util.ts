import { SpanStatusCode, trace } from '@opentelemetry/api';
const tracer = trace.getTracer('29-ai-workspace');
export function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  operation: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await operation();
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
export async function* tracedIterable<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  source: AsyncIterable<T>,
): AsyncGenerator<T> {
  const span = tracer.startSpan(name, { attributes });
  try {
    for await (const item of source) yield item;
  } catch (error) {
    span.recordException(
      error instanceof Error ? error : new Error(String(error)),
    );
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
