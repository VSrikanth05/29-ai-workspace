# Backup, restore, and disaster recovery

Database backups use PostgreSQL custom format plus SHA-256 checksums:

```sh
BACKUP_DATABASE_URL=... BACKUP_DIR=/secure/backups scripts/backup.sh
RESTORE_DATABASE_URL=... scripts/restore.sh /secure/backups/aida-TIMESTAMP.dump
```

Object storage uses AWS CLI for R2 or a configured rclone remote for Supabase:

```sh
STORAGE_PROVIDER=r2 STORAGE_BACKUP_DIR=/secure/backups/objects scripts/backup-storage.sh
STORAGE_PROVIDER=r2 scripts/restore-storage.sh /secure/backups/objects-TIMESTAMP.tar.gz
```

Encrypt and replicate database and object snapshots off-site together. Record
their timestamps, checksums, schema migration, encryption key version, and test
restore result. Recommended targets are RPO 24 hours and RTO four hours; adjust
to business requirements.

Restoration is destructive. Restore into an isolated environment, verify
checksums, compare document/object counts, apply forward migrations, run
`scripts/verify-health.sh`, then execute Playwright smoke tests. Promote the
restored environment only after authorization. Never overwrite the only copy
of a damaged production database.
