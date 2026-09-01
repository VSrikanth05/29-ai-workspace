# Read-only sharing

Share creation requires editor access to the target workspace and exactly one
source or AI output. The server generates a 32-byte random URL-safe token and
stores only its SHA-256 hash. Optional expiration is evaluated on every public
read. Disabling a link sets `revokedAt` and is immediately effective.

The public endpoint returns a narrow read-only projection of the bound target.
It never accepts a workspace identifier and cannot traverse to other workspace
resources. Revoked and expired links return Gone; unknown links return Not
Found. Create and disable actions produce structured audit log events.

Deployment must set `FRONTEND_URL` to the canonical public frontend origin so
generated links use the correct host.
