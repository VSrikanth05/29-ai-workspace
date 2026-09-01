# Production security

- Supabase bearer tokens are length/control-character checked and authenticated
  server-side. Every tenant access passes the centralized workspace role guard.
- Login and registration have tighter rate limits. Global rate limits remain a
  second line behind the ingress/WAF distributed limiter.
- JSON/form bodies are capped by `REQUEST_BODY_LIMIT`; multipart uploads retain
  the 20 MB limit and signature validation.
- API Helmet policy and frontend CSP deny framing, objects, broad origins,
  camera/microphone/geolocation, unsafe redirects, and cross-origin resources.
  Production HSTS is enabled. Bearer authentication does not use ambient
  cookies, so browser CSRF does not apply to API calls.
- Public shares store only token hashes and expose one bound read-only target.
- Audit events contain bounded metadata, IP, user agent, user/workspace/action,
  and request IDs; credentials and document/output content are excluded.

Use TLS 1.2+, secret-manager injection, short-lived deployment credentials,
private database/Redis/storage networks, immutable images, non-root read-only
containers, SBOM/provenance, dependency/image scanning, and regular key
rotation. Production audits fail CI on high or critical runtime findings.

Environment variables are documented in `.env.example`. Required production
groups are database, Supabase Auth, selected storage provider, exact CORS
origins, frontend URL, required Redis, and at least one LLM key. OpenTelemetry
requires an absolute OTLP trace endpoint when enabled.
