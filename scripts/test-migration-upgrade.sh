#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_NAME="todd_upgrade_${$}"

cleanup() {
  dropdb --if-exists "$DATABASE_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

createdb "$DATABASE_NAME"
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
  -f "$ROOT_DIR/prisma/migrations/20260809130000_init/migration.sql" >/dev/null
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" >/dev/null <<'SQL'
INSERT INTO "SiteConfig" (
  "id", "version", "isActive", "theme", "accent", "heroTitle",
  "heroSubtitle", "ctaCopy", "statusText", "frogMood", "frogAccessory",
  "enabledSections"
) VALUES
  ('config-1', 1, false, 'classic_swamp', 'lime', 'TODD', 'One', 'Suggest', 'Idle', 'calm', 'none', '[]'),
  ('config-2', 2, false, 'classic_swamp', 'mint', 'TODD', 'Two', 'Suggest', 'Idle', 'calm', 'none', '[]'),
  ('config-3', 3, true, 'midnight_swamp', 'mint', 'TODD', 'Three', 'Suggest', 'Idle', 'pleased', 'none', '[]');
INSERT INTO "AiRun" ("id", "operation", "request", "response", "error") VALUES
  ('ai-success', 'legacy', '{}', '{"ok":true}', NULL),
  ('ai-failure', 'legacy', '{}', NULL, 'legacy failure'),
  ('ai-unknown', 'legacy', '{}', NULL, NULL);
SQL
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
  -f "$ROOT_DIR/prisma/migrations/20260809230000_brain_backend/migration.sql" >/dev/null
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" >/dev/null <<'SQL'
DO $$
BEGIN
  IF (SELECT "parentConfigId" FROM "SiteConfig" WHERE "id" = 'config-2') IS DISTINCT FROM 'config-1' THEN
    RAISE EXCEPTION 'config-2 lineage was not backfilled';
  END IF;
  IF (SELECT "parentConfigId" FROM "SiteConfig" WHERE "id" = 'config-3') IS DISTINCT FROM 'config-2' THEN
    RAISE EXCEPTION 'active config lineage was not backfilled';
  END IF;
  IF (SELECT "status" FROM "AiRun" WHERE "id" = 'ai-success') IS DISTINCT FROM 'SUCCEEDED' THEN
    RAISE EXCEPTION 'successful legacy AI run was not terminalized truthfully';
  END IF;
  IF (SELECT "status" FROM "AiRun" WHERE "id" = 'ai-failure') IS DISTINCT FROM 'FAILED' THEN
    RAISE EXCEPTION 'failed legacy AI run was not terminalized truthfully';
  END IF;
  IF (SELECT "status" FROM "AiRun" WHERE "id" = 'ai-unknown') IS DISTINCT FROM 'LEGACY_UNKNOWN' THEN
    RAISE EXCEPTION 'ambiguous legacy AI run was not marked unknown';
  END IF;
END $$;
SQL

echo "Dataful migration upgrade rehearsal passed."
