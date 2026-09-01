# Release and rollback

1. Create a version tag from a green protected main branch.
2. CI validates locks, Prisma and migrations, lint/types, unit/integration/
   frontend/Playwright tests, production builds, runtime audits, Trivy, SBOM,
   Docker images, Compose, and the release archive.
3. `release.yml` publishes immutable SHA/version GHCR images with provenance,
   SBOM attestations, checksummed deployment package, and release notes.
4. Back up database and objects; deploy migrations; canary worker, API, then
   frontend; validate readiness, metrics, traces, audits, and smoke tests.
5. Gradually increase traffic while watching the documented SLO signals.

Rollback uses the previous image digests. Additive migrations stay applied and
are corrected forward. For a data incident, follow `BACKUP.md` and restore into
a new isolated environment. Record approver, deployed digests, migration IDs,
backup IDs, start/end times, and validation results for every release.
