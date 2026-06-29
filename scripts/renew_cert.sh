#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/sintezum}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$PROJECT_DIR"

mkdir -p letsencrypt certbot_www

docker run --rm \
    -v "$PROJECT_DIR/letsencrypt:/etc/letsencrypt" \
    -v "$PROJECT_DIR/certbot_www:/var/www/certbot" \
    certbot/certbot renew --webroot -w /var/www/certbot --quiet

if docker compose -f "$COMPOSE_FILE" ps -q nginx >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" exec -T nginx nginx -s reload \
        || docker compose -f "$COMPOSE_FILE" restart nginx
fi

echo "Certificate renewal check complete."

