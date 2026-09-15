#!/bin/bash
# Auto-deploy del backend de StockPay Web Demo en x270-server.
# Cron cada minuto. Si no hay commits nuevos en origin/stockpay-web, no hace nada.
#
# ⚠️ Rama fija en "stockpay-web" a propósito, NO "main": este repo
# (EscencialConsult/stockpay-demo) tiene la demo web de Carnicería archivada
# en main y la demo real de StockPay vive en la rama stockpay-web, que es la
# que Netlify sirve como Production branch. Un bug real (copiar este script
# del proyecto de Carnicería sin cambiar el nombre de rama) hizo que esto
# apuntara a "main" durante horas: cada corrida reseteaba el clon del
# servidor al código viejo de Carnicería y el "docker compose up" fallaba en
# silencio con "no such service" (el compose.yml de main no tiene el
# servicio stockpay-web-backend) — o sea, ningún fix de backend llegaba a
# producción aunque el push a GitHub fuera perfecto. Si esta demo alguna vez
# cambia de rama de nuevo, actualizar acá TAMBIÉN, no solo en Netlify.
BRANCH="stockpay-web"
set -e
cd "$(dirname "$0")/.."
LOGFILE="deploy-x270/deploy.log"

git fetch origin "$BRANCH" >> "$LOGFILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date '+%F %T') actualizando de $LOCAL a $REMOTE" >> "$LOGFILE"
  git reset --hard "origin/$BRANCH" >> "$LOGFILE" 2>&1
  docker compose up -d --build stockpay-web-backend >> "$LOGFILE" 2>&1
  echo "$(date '+%F %T') deploy terminado" >> "$LOGFILE"
fi
