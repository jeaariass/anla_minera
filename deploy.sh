#!/usr/bin/env bash
#
# deploy.sh — reinicio idempotente del backend de TUMINA en el VPS.
#
# Ubicación en el VPS: /srv/anm-fri-backend/deploy.sh
#
# Flujo esperado:
#   1. Subes los archivos modificados del backend por WinSCP a /srv/anm-fri-backend/.
#   2. SSH al VPS y corres:
#        cd /srv/anm-fri-backend
#        bash deploy.sh
#
# Qué hace:
#   - Instala dependencias nuevas si package.json cambió (idempotente).
#   - Regenera el cliente Prisma si el schema cambió.
#   - Aplica migraciones pendientes (idempotente, salta las ya aplicadas).
#   - Reinicia PM2 con --update-env para que recoja cambios del .env.
#
# El frontend NO se toca aquí — va aparte a Hostinger con el build local.

set -euo pipefail

PROJECT_DIR="/srv/anm-fri-backend"
PM2_NAME="tumina-backend"

log()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[[ -d "$PROJECT_DIR" ]]            || fail "No existe $PROJECT_DIR."
[[ -f "$PROJECT_DIR/package.json" ]] || fail "No hay package.json en $PROJECT_DIR."
command -v pm2  >/dev/null || fail "pm2 no está instalado."
command -v node >/dev/null || fail "node no está instalado."

cd "$PROJECT_DIR"

log "1/4 npm install (production)"
npm install --omit=dev

log "2/4 prisma generate"
npx prisma generate

log "3/4 prisma migrate deploy"
npx prisma migrate deploy

log "4/4 pm2 restart --update-env"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start src/server.js --name "$PM2_NAME" --update-env
  pm2 save
fi

log "✅ Despliegue completo."
pm2 status "$PM2_NAME" || true
