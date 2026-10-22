#!/usr/bin/env bash
# Puts a nightly backup (see .github/workflows/backup.yml) into a new, empty Supabase project:
# the tables and access rules, every account, all words and practice history, and the pictures.
#
#   scripts/restore-backup.sh qinglan-backup-2026-10-21.tar.gz.gpg
#
# The file comes from the Backup run's Artifacts (unzip the download first). The script asks for
# the backup passphrase (or takes it from BACKUP_PASSPHRASE), and needs these for the NEW project:
#
#   export NEW_DB_URL='postgresql://…'        # Connect → Session pooler, password filled in
#   export NEW_S3_ENDPOINT='https://….storage.supabase.co/storage/v1/s3'   # Storage → S3 Connection
#   export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=…                  # Storage → S3 access key
#   export AWS_DEFAULT_REGION=…                                       # the project's region
#
# Needs psql (PostgreSQL 17 or newer), gpg, the AWS CLI and Node.js. On Windows, run it in Git Bash.
# Afterwards, point the site at the new project (README, Deploying step 5).
#
# If some pictures fail to upload, run it again with --pictures-only after the file name.
set -euo pipefail

backup=${1:?Usage: scripts/restore-backup.sh <qinglan-backup-….tar.gz.gpg> [--pictures-only]}
pictures_only=${2:-}
for name in NEW_DB_URL NEW_S3_ENDPOINT AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION; do
  if [ -z "${!name:-}" ]; then echo "Set $name first (see the top of this script)." >&2; exit 1; fi
done
backup=$(cd "$(dirname "$backup")" && pwd)/$(basename "$backup")
cd "$(dirname "$0")/.."

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
sql() { psql "$NEW_DB_URL" --no-psqlrc -At "$@" | tr -d '\r'; }

if [ "$pictures_only" != --pictures-only ] && [ "$(sql -c 'select count(*) from auth.users')" != 0 ]; then
  echo "The new project already has accounts in it. Restore into an empty project." >&2
  exit 1
fi

echo "Opening the backup…"
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  gpg --batch --pinentry-mode loopback --passphrase-fd 3 --decrypt "$backup" 3<<<"$BACKUP_PASSPHRASE" | tar -xzf - -C "$work"
else
  gpg --decrypt "$backup" | tar -xzf - -C "$work"
fi

if [ "$pictures_only" != --pictures-only ]; then
  echo "Creating the tables and access rules…"
  npx supabase db push --db-url "$NEW_DB_URL" --yes

  echo "Loading accounts, words and practice history…"
  # One transaction: if anything fails, nothing changes. The migrations made the pictures bucket,
  # and the backup has its own copy of it.
  sql --single-transaction --variable ON_ERROR_STOP=1 --quiet --output /dev/null \
    --command 'SET session_replication_role = replica' \
    --command "delete from storage.buckets where id = 'word-images'" \
    --file "$work/data.sql"
fi

echo "Uploading the pictures…"
# Each with its original type: the bucket only takes images, and the files have no extensions.
# (aws s3 sync would skip them all, since the restored data already lists every picture.)
uploaded=0
failed=0
while IFS=$'\t' read -r name type; do
  if aws s3 cp "$work/storage/word-images/$name" "s3://word-images/$name" --content-type "$type" \
    --endpoint-url "$NEW_S3_ENDPOINT" --only-show-errors < /dev/null; then
    uploaded=$((uploaded + 1))
  else
    failed=$((failed + 1))
  fi
done < <(sql -F $'\t' -c "select name, metadata->>'mimetype' from storage.objects where bucket_id = 'word-images'")

echo "Restored $(sql -c 'select count(*) from public.profiles') accounts," \
  "$(sql -c 'select count(*) from public.words') words," \
  "$(sql -c 'select count(*) from public.practices') practice sessions and $uploaded pictures."
if [ "$failed" -gt 0 ]; then
  echo "$failed pictures couldn't be uploaded. Run the script again with --pictures-only to retry them." >&2
  exit 1
fi
