#!/usr/bin/env bash
# Runs the database tests against a throwaway local Postgres.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres tests/db/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="raid_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql -q -X -v ON_ERROR_STOP=1 -d "$db" -f "$here/supabase_stub.sql" >/dev/null
# Applied twice on purpose: the migration must be safe to re-run.
psql -q -X -v ON_ERROR_STOP=1 -d "$db" -f "$here/../../supabase/migrations/20261124000000_verified_raid.sql" >/dev/null 2>&1
psql -q -X -v ON_ERROR_STOP=1 -d "$db" -f "$here/../../supabase/migrations/20261124000000_verified_raid.sql" >/dev/null 2>&1
# Later migrations, in order.
for m in "$here"/../../supabase/migrations/*.sql; do
    case "$m" in *20261124000000_verified_raid.sql) continue ;; esac
    psql -q -X -v ON_ERROR_STOP=1 -d "$db" -f "$m" >/dev/null 2>&1
done
psql -q -X -t -A -v ON_ERROR_STOP=1 -d "$db" -f "$here/policies.test.sql" | tee /tmp/raid_db_test.out
! grep -q '^FAIL' /tmp/raid_db_test.out
