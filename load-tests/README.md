# k6 load tests

Run the mixed steady-state profile against staging only:

```sh
k6 run -e BASE_URL=https://api.staging.example.com \
  -e ACCESS_TOKEN=... -e WORKSPACE_ID=... -e SOURCE_ID=... -e OUTPUT_ID=... \
  load-tests/workspace.js
```

The default profile models 20 concurrent workspace readers, 25 searches per
second, and five concurrent streaming chats for one minute. Required thresholds
are under 1% HTTP failure, p95 under 750 ms overall, p99 under two seconds, and
search p95 under 300 ms. AI latency depends on provider capacity and should be
tracked separately from application latency.

Run isolated expensive scenarios with `--exec uploads`, `--exec analytics`, or
`--exec exports`, starting with one VU and enforcing staging quotas. Never run
write or AI scenarios against production without an approved test workspace,
budget, rate window, and incident owner.
