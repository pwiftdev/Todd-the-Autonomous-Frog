#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 -c "ALTER ROLE postgres PASSWORD 'disposable-only'" >/dev/null
export PGPASSWORD="disposable-only"
export DATABASE_URL="postgresql://postgres:disposable-only@127.0.0.1:${PGPORT}/postgres?sslmode=disable"
export TEST_DATABASE_URL="$DATABASE_URL"

bash scripts/test-migration-upgrade.sh
npx prisma migrate deploy
npx prisma migrate deploy
npm run test:postgres:existing
