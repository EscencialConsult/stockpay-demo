#!/bin/bash
# Resetea la demo compartida a un estado limpio: borra todo lo cargado por
# quien haya usado la demo antes, y vuelve a sembrar el catálogo de ejemplo.
# Es UNA sola instancia pública para todos los vendedores/prospectos, así que
# sin esto un prospecto podría dejar la demo "sucia" para el siguiente.
# Pensado para correr por cron cada varias horas (ver deploy-x270/README.md).
set -e
LOGFILE="$(dirname "$0")/reset-demo.log"
BASE="http://127.0.0.1:8084"

TOKEN=$(curl -s -X POST "$BASE/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "$(date '+%F %T') ERROR: no se pudo obtener token de admin" >> "$LOGFILE"
  exit 1
fi

curl -s -X POST "$BASE/api/demo/clear" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' >> "$LOGFILE" 2>&1
echo "" >> "$LOGFILE"

curl -s -X POST "$BASE/api/demo/seed" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' >> "$LOGFILE" 2>&1
echo "" >> "$LOGFILE"

echo "$(date '+%F %T') reset de demo completado" >> "$LOGFILE"
