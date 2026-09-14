#!/bin/bash
# Auto-deploy del backend de StockPay Web Demo en x270-server.
# Cron cada minuto. Si no hay commits nuevos en origin/main, no hace nada.
set -e
cd "$(dirname "$0")/.."
LOGFILE="deploy-x270/deploy.log"

git fetch origin main >> "$LOGFILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date '+%F %T') actualizando de $LOCAL a $REMOTE" >> "$LOGFILE"
  git reset --hard origin/main >> "$LOGFILE" 2>&1
  docker compose up -d --build stockpay-web-backend >> "$LOGFILE" 2>&1
  echo "$(date '+%F %T') deploy terminado" >> "$LOGFILE"
fi
