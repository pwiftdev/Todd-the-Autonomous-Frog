#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pg_virtualenv >/dev/null 2>&1; then
  echo "pg_virtualenv is required for disposable PostgreSQL tests." >&2
  exit 1
fi

exec pg_virtualenv bash "$ROOT_DIR/scripts/test-postgres-inner.sh"
