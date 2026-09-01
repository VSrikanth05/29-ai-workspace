#!/bin/sh
set -eu
base="${BACKEND_HEALTH_URL:-http://localhost:5000}"
frontend="${FRONTEND_HEALTH_URL:-http://localhost:8080}"
curl --fail --silent --show-error "${base}/health/live" >/dev/null
curl --fail --silent --show-error "${base}/health/ready" >/dev/null
curl --fail --silent --show-error "${frontend}/healthz" >/dev/null
echo "API liveness, dependency readiness, and frontend health checks passed."
