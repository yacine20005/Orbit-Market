#!/bin/bash

# Production deployment script for Orbit Market API
# Run this on your DigitalOcean droplet (NOT for local development; use start_local_server.sh locally)

set -euo pipefail

DOMAIN="${DOMAIN:-api.yacine-hamadouche.me}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ya.hamadouche@gmail.com}"
APP_DIR="/home/orbitmarket/orbit-market"
REPO_URL="https://github.com/yacine20005/Orbit-Market.git"

echo "Deploying Orbit Market API..."

sudo mkdir -p "$APP_DIR"
sudo chown orbitmarket:orbitmarket "$APP_DIR"

cd "$APP_DIR"

if [ -d ".git" ]; then
    echo "Updating code..."
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository..."
    git clone "$REPO_URL" .
fi

echo "Building and starting Docker container..."
docker compose down --remove-orphans || true
docker compose build --no-cache
docker compose up -d

echo "Waiting for application /health..."
ready=0
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done

if [ "$ready" -eq 1 ]; then
    echo "Application started successfully!"
else
    echo "Error: Application is not responding on /health"
    docker compose logs
    exit 1
fi

echo "Configuring Nginx..."
sudo cp nginx-config.conf /etc/nginx/sites-available/orbit-market
sudo sed -i "s/server_name .*/server_name ${DOMAIN};/" /etc/nginx/sites-available/orbit-market
sudo ln -sf /etc/nginx/sites-available/orbit-market /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "Configuring SSL..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL"

echo "Deployment completed! API: https://${DOMAIN}/health"
