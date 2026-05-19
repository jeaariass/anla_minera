# CLAUDE.md — Notas para Claude Code

Este archivo lo lee Claude al inicio de cada sesión. Contiene contexto
crítico del proyecto y planes pendientes que no caben en el README público.

---

## Visión general

Monorepo TU MINA — plataforma ANM-FRI. Tres apps:

| Carpeta | Stack |
|---|---|
| `backend/` | Node + Express + Prisma + PostgreSQL |
| `frontend/` | React 19 + Vite (montado en `/TU_MINA/`) |
| `tu-mina-mobile/` | Expo SDK 54 + React Native |

`tu-mina-web/` es **scaffold CRA sin uso real** — ignorar.

`backend/prisma/seed.js` tiene ~75k tokens (data semilla); usar `seed_prueba.js`
como referencia más liviana.

---

## Categorías de actividad — fuente única

Definición central (todas las apps):

- `backend/src/utils/categorias.js`
- `frontend/src/constants/categorias.js`
- `tu-mina-mobile/src/utils/categorias.js`

**Regla**: ninguna página/controller declara su propio array de categorías.
Si necesitas un subset (ej. sin `inspeccion`), importa `CATEGORIAS_CAMPO`.

Para agregar una categoría:

1. Añadir entrada al array `CATEGORIAS` en los **tres** archivos (espejados).
2. Si la UI usa CSS específico (`cat-extraccion`, `chip-extraccion`,
   `dopd-cat-badge.extraccion`, etc.), agregar reglas en los `.css` afectados:
   - `frontend/src/pages/FormulariosOperacion.css`
   - `frontend/src/pages/ResumenOperacion.css`
   - `frontend/src/pages/DashboardOperacion.css`
3. ADMIN crea ítems para la categoría desde `/catalogos-campo` (web).

Categorías actuales (ene 2026):

| id | label | color | esCampo |
|---|---|---|---|
| `extraccion` | Extracción | `#e74c3c` | sí |
| `acopio` | Acopio | `#3498db` | sí |
| `procesamiento` | Procesamiento | `#f39c12` | sí |
| `reprocesamiento` | Reprocesamiento | `#14b8a6` | sí |
| `inspeccion` | Inspección | `#27ae60` | no (solo catálogo de minerales) |

---

## Fase 3 — categorías activas por título minero (pendiente)

Cada título minero debe poder elegir qué categorías usa
(ej. mina A solo `extraccion`+`acopio`; mina B las 4 de campo).

**No implementado todavía.** Lo siguiente es el plan acordado.

### Decisión técnica

Tabla relacional (no JSON column) — más fácil de consultar/filtrar y mantiene
integridad referencial. Schema propuesto:

```prisma
model TituloCategoria {
  id              String       @id @default(uuid())
  tituloMineroId  String
  categoria       String       // 'extraccion' | 'acopio' | ...
  activo          Boolean      @default(true)
  orden           Int          @default(0)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  tituloMinero    TituloMinero @relation(fields: [tituloMineroId], references: [id], onDelete: Cascade)

  @@unique([tituloMineroId, categoria])
  @@map("titulo_categorias")
}
```

Agregar en `model TituloMinero`: `categorias TituloCategoria[]`.

### Migración / backfill

Para preservar el comportamiento actual:

```sql
INSERT INTO titulo_categorias (id, "tituloMineroId", categoria, activo, orden, "createdAt", "updatedAt")
SELECT gen_random_uuid(), t.id, c.id, true, c.orden, NOW(), NOW()
FROM titulos_mineros t
CROSS JOIN (VALUES
  ('extraccion', 1), ('acopio', 2),
  ('procesamiento', 3), ('reprocesamiento', 4),
  ('inspeccion', 5)
) AS c(id, orden);
```

Al crear título nuevo (`POST /api/titulos`) insertar las 5 categorías por defecto
dentro del mismo `$transaction`.

### Endpoints nuevos

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/titulos/:id/categorias` | `tituloMiddleware` |
| PUT | `/api/titulos/:id/categorias` | `EDITAR_TITULO` (ADMIN) |

`PUT` body: `{ categorias: [{ categoria: 'extraccion', activo: true, orden: 1 }, ...] }`

### Validación en backend

En `puntosActividadController.registrarPunto` y `editarPunto`:

```js
const activa = await prisma.$queryRaw`
  SELECT 1 FROM titulo_categorias
  WHERE "tituloMineroId" = ${tituloMineroId} AND categoria = ${categoria} AND activo = true
  LIMIT 1`;
if (activa.length === 0) return res.status(400).json({ success: false, message: 'Categoría no activa para este título minero' });
```

### Frontend / Mobile

- Crear hook `useCategoriasActivas()` en `frontend/src/hooks/` que escuche
  `tituloActivoId` del `TituloContext`, fetcheé `/api/titulos/:id/categorias`,
  filtre `CATEGORIAS_CAMPO` y cachee en localStorage.
- En mobile: función `cargarCategoriasActivas(tituloId)` en `actividadService`,
  llamarla en `RegistrarPuntoScreen.useEffect` cuando `userData` cambia.
- Reemplazar `CATEGORIAS_CAMPO` directo por categorías filtradas del hook.

### UI admin

Agregar al modal "Editar Título" de `Usuarios.jsx` (pestaña "Títulos Mineros"):

```
┌── Categorías activas ────────────────┐
│ ☑ ⛏️ Extracción                       │
│ ☑ 📦 Acopio                           │
│ ☐ ⚙️ Procesamiento                    │
│ ☐ ♻️ Reprocesamiento                  │
│ ☑ 🔍 Inspección                       │
└──────────────────────────────────────┘
```

### Edge cases

- Título sin categorías activas → bloquear registro con mensaje claro.
- Desactivar categoría con puntos históricos → soft (no DELETE). Histórico
  sigue visible en `/resumen-operacion` y `/mapa`, pero no permite nuevos
  registros (validación en `registrarPunto`).
- ADMIN/ASESOR (rol global) → respeta las categorías del título seleccionado
  en `TituloContext`, NO ve todas las categorías globales.

### Orden de implementación sugerido

1. Migración Prisma + backfill SQL.
2. Endpoints GET/PUT.
3. Validación en `registrarPunto` y `editarPunto`.
4. Hook frontend + función mobile.
5. UI admin (modal editar título).
6. Reemplazar consumers de `CATEGORIAS_CAMPO` por hook/función filtrada.

---

## Bugs conocidos / deuda técnica

- `backend/src/server.js:2772` — referencia `pdfExporter.generarPDFConsolidado`
  pero `pdfExporter` no está importado. Endpoint `/api/reportes/exportar-pdf`
  está roto. Fix: agregar `const pdfExporter = require('./services/pdfExporter');`
  al tope del archivo, o mover esa lógica a un controller.
- `puntosActividadController` y `paradasController` usan `$executeRawUnsafe`
  con interpolación de strings (`tituloMineroId`, `usuarioId`, `dia`).
  Aunque `authMiddleware` valida user, los valores aún se inyectan crudos en SQL.
  Migrar a `$executeRaw` (template literal con `${}`) — Prisma lo parametriza.
- `gestorArchivosController.js:21` — instancia `new PrismaClient()` por request.
  Connection leak. Usar el cliente compartido del módulo (importarlo arriba).
- `scripts/cambiar_puertos.sh` — usa `sed -i ''` (sintaxis BSD/macOS).
  Falla en Linux VPS. Cambiar a `sed -i` (sin string vacío) o usar `sed -i.bak`.
- `puntos_actividad.punto_actividad_id` se inserta en `paradasController` pero
  no existe en `schema.prisma`. Definir relación opcional o quitar el INSERT.
- `paradasController` y `puntosActividadController` interpolan `tituloMineroId`
  directamente en SQL crudo (`WHERE titulo_minero_id = '${tituloMineroId}'`).
  Cambiar a parámetros posicionales (`$1`) o `$queryRaw` con template.

---

## Permisos y roles

Sistema centralizado: `backend/src/utils/permissions.js` (servidor),
`frontend/src/utils/permissions.js` (cliente). Roles definidos en enum
`Rol` de Prisma: ADMIN, ASESOR, TITULAR, JEFE_PLANTA, OPERARIO, VENDEDOR.

- ADMIN + ASESOR son **globales** (acceso a todos los títulos).
- TITULAR, JEFE_PLANTA, OPERARIO, VENDEDOR son **locales** (filtrados por
  `usuario.tituloMineroId`).
- Cambios de permisos: SIEMPRE editar `permissions.js` (servidor) primero,
  luego replicar en cliente. Nunca hardcodear roles en rutas individuales.

JWT expira en 8h. Mobile y web tienen cierre automático por expiración
(reactivo via interceptor + proactivo al volver a foreground).

---

## Timezone

Backend almacena timestamps **naive en hora Colombia (UTC-5)**.
Helpers `colombiaToday()` y `toColombiaStr()` en `puntosActividadController.js`
y `paradasController.js`. Al leer, formatear con `TO_CHAR(..., 'YYYY-MM-DD"T"HH24:MI:SS')`.

No usar `new Date(iso)` en cliente para formatear; parsear el string directo
(`String(iso).split('T')[0]`) para evitar desfase.

---

## Despliegue

- Backend en VPS Hostinger `200.7.107.14`, PM2 proceso `tumina-backend`,
  carpeta `/srv/anm-fri-backend`. Deploy via `deploy.sh` (idempotente).
- Frontend buildea local con `npm run build`, sube `dist/` por FTP a
  Hostinger `/public_html/TU_MINA/`. Servido por Apache + `.htaccess`.
- Mobile builds con `eas build --platform android`. `projectId` en `app.json`.

**Plan unificación VPS** (pendiente): ver `PROXIMOS_CAMBIOS.md`.
