#!/bin/bash
# Auto-deploy de la demo StockPay en x270-server.
# Se corre por cron cada minuto. Si no hay commits nuevos en origin/main, no hace nada.
# Si el build rompe, el contenedor viejo sigue corriendo (docker compose up -d --build
# no baja el servicio hasta tener la imagen nueva lista).
set -e
cd "$(dirname "$0")/.."
LOGFILE="deploy-x270/deploy.log"

git fetch origin main >> "$LOGFILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date '+%F %T') actualizando de $LOCAL a $REMOTE" >> "$LOGFILE"
  git reset --hard origin/main >> "$LOGFILE" 2>&1
  docker compose up -d --build stockpay-backend >> "$LOGFILE" 2>&1
  echo "$(date '+%F %T') deploy terminado" >> "$LOGFILE"
fi
