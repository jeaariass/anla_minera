# Próximos cambios — TUMINA

Archivo de contexto para los siguientes ciclos de trabajo. Cuando algo de aquí
se complete, se borra de este archivo. No es un changelog.

---

## Unificar despliegue — subir frontend + backend al VPS

### Estado actual
- **Backend**: `/srv/anm-fri-backend/` en VPS (PM2 proceso `tumina-backend`,
  Node 20). Se actualiza vía WinSCP + `pm2 restart`.
- **Frontend**: build local (`npm run build`) → subir `dist/` por FTP a
  Hostinger bajo `/public_html/TU_MINA/`. Servido por Apache de Hostinger.
- `deploy.sh` en la raíz del repo automatiza **solo el backend**.

### Objetivo
Mover el frontend al mismo VPS, junto al backend, y que un único `deploy.sh`
los actualice juntos — igual que los otros proyectos del usuario
(`intranet-ctglobal`, `tramites-ctglobal`).

### Decisiones pendientes (confirmar con Jesús antes de implementar)

**A. ¿Dónde queda el frontend en el VPS?**
1. Misma carpeta del backend → `/srv/anm-fri-backend/frontend/dist/` (recomendado, monorepo).
2. Carpeta hermana → `/srv/anm-fri-frontend/dist/`.

**B. ¿Build del frontend en el VPS o build local + sync?**
1. Build en el VPS: `deploy.sh` corre `npm install && npm run build` dentro
   de `frontend/`. Más simple, más lento, requiere Node + memoria en VPS.
2. Build local + rsync `dist/`: rápido y predecible, requiere rsync o
   WinSCP configurado.

**C. ¿Sigue `ctglobal.com.co/TU_MINA/` apuntando a Hostinger Apache, o se
mueve a Nginx del VPS?**
- Si se mueve a Nginx del VPS: ya no hace falta el `.htaccess` (lo reemplaza
  `try_files`). Hay que apuntar el dominio al VPS y agregar bloque Nginx.
- Si se queda en Hostinger: no hay unificación real, solo se sigue subiendo
  `dist/` por FTP.

Sospecha: la respuesta correcta es **A1 + B1 + C (mover a Nginx)**.

### Esqueleto del `deploy.sh` unificado (cuando se confirmen A/B/C)

```bash
#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="/srv/anm-fri-backend"

cd "$PROJECT_DIR"

# Backend
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy

# Frontend (build en VPS)
cd "$PROJECT_DIR/frontend"
npm install
npm run build

# Reiniciar backend
cd "$PROJECT_DIR"
pm2 restart tumina-backend --update-env
```

### Bloque Nginx de referencia

```nginx
location /TU_MINA/ {
    alias /srv/anm-fri-backend/frontend/dist/;
    try_files $uri $uri/ /TU_MINA/index.html;
}

location /TU_MINA/api/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Y `frontend/.env.production` actualizaría `VITE_API_URL` a la nueva URL del
backend en el VPS (verificar valor actual antes de tocar).

### Limpieza pendiente al hacer el cambio
- Eliminar el `.htaccess` de `frontend/public/` (queda obsoleto con `try_files` de Nginx).
- Borrar la carpeta `/public_html/TU_MINA/` en Hostinger.
