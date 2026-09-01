# AI streaming

`POST /ai/chat/stream` returns Server-Sent Events. The wire format is:

```text
retry: 3000

event: delta
data: {"type":"delta","content":"..."}

event: done
data: {"type":"done","conversationId":"...","message":{},"sources":[],"finishReason":"stop"}
```

Errors are sent as `event: error` with `statusCode`, `code`, `message`, and
`requestId`. Every data event is separated by a blank line. The frontend parser
buffers arbitrary network chunks and therefore does not assume one event per
read.

OpenAI, Gemini, Anthropic, and OpenRouter provider streams are normalized to text
deltas. If a provider lacks native streaming, the gateway retains a one-chunk
compatibility fallback. Closing the browser request aborts the provider fetch,
marks the conversation `CANCELLED`, records an analytics outcome, and avoids
saving partial assistant text. Successful completion saves the assistant message
and conversation status in one transaction.

Reverse proxies must preserve `text/event-stream`, disable buffering and
compression for this route, and allow responses longer than normal request
timeouts. `X-Request-Id` should be forwarded for correlation.
