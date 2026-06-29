#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/sintezum}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/backups/automated}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
INCLUDE_ENV="${INCLUDE_ENV:-0}"

cd "$PROJECT_DIR"

timestamp="$(date +%F_%H%M%S)"
backup_dir="$BACKUP_ROOT/sintezum_$timestamp"
mkdir -p "$backup_dir"

env_value() {
    key="$1"
    sed -n "s/^$key=//p" .env | tail -n 1
}

db_user="$(env_value DB_USER)"
db_name="$(env_value DB_NAME)"

if [ -z "$db_user" ] || [ -z "$db_name" ]; then
    echo "DB_USER or DB_NAME is missing in $PROJECT_DIR/.env" >&2
    exit 1
fi

echo "Creating PostgreSQL backup..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$db_user" -d "$db_name" -Fc \
    > "$backup_dir/postgres_${db_name}.dump"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dumpall -U "$db_user" --globals-only \
    > "$backup_dir/postgres_globals.sql"

echo "Creating MinIO volume backup..."
minio_container="$(docker compose -f "$COMPOSE_FILE" ps -q minio)"
minio_volume="$(docker inspect "$minio_container" --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}')"

if [ -z "$minio_volume" ]; then
    echo "Could not detect MinIO /data volume" >&2
    exit 1
fi

docker run --rm \
    -v "$minio_volume":/data:ro \
    -v "$backup_dir":/backup \
    alpine sh -c 'cd /data && tar -czf /backup/minio_data.tar.gz .'

cp docker-compose.prod.yml "$backup_dir/docker-compose.prod.yml"
cp nginx/nginx.prod.conf.template "$backup_dir/nginx.prod.conf.template"

if [ "$INCLUDE_ENV" = "1" ]; then
    cp .env "$backup_dir/env.production"
    chmod 600 "$backup_dir/env.production"
fi

archive="$BACKUP_ROOT/sintezum_$timestamp.tar.gz"
tar -czf "$archive" -C "$BACKUP_ROOT" "sintezum_$timestamp"
chmod 600 "$archive"

echo "Backup created: $archive"
du -sh "$archive"

find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'sintezum_*.tar.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -type d -name 'sintezum_*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

