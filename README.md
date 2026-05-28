# TU MINA — Plataforma ANM-FRI

Plataforma integral para la gestión de **Formularios de Registro de Información (FRI)** ante la **Agencia Nacional de Minería (ANM)** de Colombia. El sistema permite a Titulares Mineros, Asesores, Jefes de Planta y Operarios capturar, validar, aprobar, exportar y consultar información de producción minera, paradas, maquinaria, regalías, certificados de origen y actividad operativa diaria.

El proyecto consta de **tres aplicaciones**:

| Módulo | Stack | Descripción |
|---|---|---|
| `backend/` | Node.js + Express + Prisma + PostgreSQL | API REST con JWT y sistema de permisos por rol |
| `frontend/` | React 19 + Vite + React-Leaflet + Recharts | SPA web (panel administrativo y operativo) |
| `tu-mina-mobile/` | React Native + Expo SDK 54 | App Android/iOS para captura en campo (con soporte offline) |

---

## Tabla de contenidos

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Configuración inicial](#configuración-inicial)
4. [Variables de entorno](#variables-de-entorno)
5. [Roles y sistema de permisos](#roles-y-sistema-de-permisos)
6. [Modelo de datos](#modelo-de-datos)
7. [Endpoints de la API](#endpoints-de-la-api)
8. [Frontend web](#frontend-web)
9. [App móvil](#app-móvil)
10. [Reportes y archivos](#reportes-y-archivos)
11. [Despliegue en producción](#despliegue-en-producción)

---

## Arquitectura

```
┌────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Frontend Web      │     │   App Móvil         │     │  Otros clientes     │
│  React + Vite      │     │   Expo / RN         │     │                     │
│  /TU_MINA          │     │   Android · iOS     │     │                     │
└──────────┬─────────┘     └──────────┬──────────┘     └──────────┬──────────┘
           │                          │                            │
           │  Bearer JWT (Authorization header)                    │
           └────────────────┬─────────┴────────────────────────────┘
                            ▼
                ┌────────────────────────────┐
                │   Backend Express          │
                │   /api/*                   │
                │  ─ authMiddleware          │
                │  ─ permisoMiddleware       │
                │  ─ tituloMiddleware        │
                │  ─ Controllers             │
                │  ─ Services (PDF / Excel)  │
                └────────────┬───────────────┘
                             │ Prisma Client
                             ▼
                ┌────────────────────────────┐
                │  PostgreSQL (anm_fri_db)   │
                │  · titulos_mineros         │
                │  · usuarios                │
                │  · fri_*                   │
                │  · puntos_actividad        │
                │  · paradas_actividad       │
                │  · certificados_origen     │
                │  · clientes_compradores    │
                └────────────────────────────┘
```

---

## Requisitos

- **Node.js 18+** (recomendado 20 LTS)
- **npm 9+**
- **PostgreSQL 14+**
- **Expo CLI** (solo para la app móvil): `npm i -g expo-cli`
- **Cuenta EAS** (para builds de producción de la app)

---

## Configuración inicial

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd TUMINA-main
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy        # aplica migraciones existentes
npx prisma db seed               # carga datos iniciales (roles, catálogos)
npm run dev                      # http://localhost:3001
```

### 3. Frontend web

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000/TU_MINA/
```

### 4. App móvil

```bash
cd tu-mina-mobile
npm install
npm run start                    # abre Expo Dev Tools
# o:
npm run android                  # compila a Android
```

> **Importante:** la app móvil utiliza una IP fija (`LOCAL_IP` en `src/utils/constants.js`). Si tu IP local cambia, edítala antes de iniciar Expo.

---

## Variables de entorno

### `backend/.env`

```env
DATABASE_URL="postgresql://usuario:password@host:5432/anm_fri_db?schema=public"
PORT=3001
NODE_ENV=development            # o production
JWT_SECRET="cadena-secreta-larga-y-aleatoria"
```

### `frontend/.env` (o `.env.development` / `.env.production`)

```env
VITE_API_URL=http://localhost:3001/api
# Producción:
# VITE_API_URL=https://api.ctglobal.com.co/api
```

### `tu-mina-mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://192.168.1.9:3001/api
```

> El base URL real para la app móvil se resuelve en `tu-mina-mobile/src/utils/constants.js` (LOCAL_IP, LOCAL_PORT en dev; `https://api.ctglobal.com.co/api` en producción).

---

## Roles y sistema de permisos

El sistema usa **autenticación JWT** y un modelo de permisos basado en *acciones nombradas* (no roles directamente en cada ruta), centralizado en `backend/src/utils/permissions.js` y replicado en `frontend/src/utils/permissions.js`.

### Roles disponibles (`enum Rol` en Prisma)

| Rol | Alcance | Descripción |
|---|---|---|
| **ADMIN** | Global | Control total: usuarios, títulos, FRIs, reportes |
| **ASESOR** | Global | Acompaña operación; puede crear/editar FRIs en cualquier título |
| **TITULAR** | Local (1 título) | Dueño del título minero; consulta y reportes |
| **JEFE_PLANTA** | Local (1 título) | Gestiona operarios y formularios operativos del título |
| **OPERARIO** | Local (1 título) | Captura puntos y paradas en campo (móvil) |
| **VENDEDOR** | Local (1 título) | Acceso a certificados de origen y gestor de archivos |

### Roles globales vs locales

```js
const ROLES_GLOBALES = ["ADMIN", "ASESOR"];
```

- **Globales:** ven datos de TODOS los títulos mineros.
- **Locales:** filtrados automáticamente por su `tituloMineroId`.

La función central es `puedeAccederATitulo(usuario, tituloMineroId)`: devuelve `true` si el usuario es global, o si su título coincide con el solicitado.

### Acciones (PERMISOS)

Todas se definen en `backend/src/utils/permissions.js`:

| Acción | Roles permitidos |
|---|---|
| **USUARIOS** | |
| `CREAR_USUARIO` | ADMIN, JEFE_PLANTA |
| `EDITAR_USUARIO` | ADMIN, JEFE_PLANTA |
| `CAMBIAR_ESTADO_USUARIO` | ADMIN, JEFE_PLANTA |
| `VER_USUARIOS` | ADMIN, ASESOR, JEFE_PLANTA |
| `ASIGNAR_ROL` | ADMIN |
| **TÍTULOS MINEROS** | |
| `CREAR_TITULO` / `EDITAR_TITULO` | ADMIN |
| `VER_TITULOS` | Todos los roles |
| **FORMULARIOS FRI** | |
| `CREAR_FRI` | ADMIN, ASESOR |
| `VER_FRI` | ADMIN, ASESOR, TITULAR, JEFE_PLANTA |
| `EDITAR_FRI` | ADMIN, ASESOR |
| `ELIMINAR_FRI` | ADMIN |
| `CAMBIAR_ESTADO_FRI` / `ENVIAR_FRI` | ADMIN, ASESOR |
| **REPORTES Y ESTADÍSTICAS** | |
| `EXPORTAR_REPORTE` | ADMIN, ASESOR, TITULAR, JEFE_PLANTA |
| `VER_ESTADISTICAS_GLOBALES` | ADMIN, ASESOR |
| `VER_ESTADISTICAS_TITULO` | ADMIN, ASESOR, TITULAR, JEFE_PLANTA |
| **CATÁLOGOS DE CAMPO** | |
| `GESTIONAR_CATALOGOS_CAMPO` | ADMIN |
| **OPERATIVOS (puntos / paradas)** | |
| `CREAR_FORMULARIO_OPERATIVO` | ADMIN, JEFE_PLANTA, OPERARIO |
| `VER_FORMULARIO_OPERATIVO` | ADMIN, ASESOR, TITULAR, JEFE_PLANTA, OPERARIO |
| `EDITAR_FORMULARIO_OPERATIVO` | ADMIN, ASESOR, JEFE_PLANTA, OPERARIO |
| `ELIMINAR_FORMULARIO_OPERATIVO` | ADMIN, ASESOR, JEFE_PLANTA, OPERARIO |
| `APROBAR_FORMULARIO_OPERATIVO` | ADMIN, JEFE_PLANTA |
| `VER_ESTADISTICAS_OPERATIVAS` | Todos menos VENDEDOR |

> Operarios y jefes de planta solo pueden editar/eliminar puntos y paradas **del mismo día** (validación en el controller).

### Reglas adicionales (`puedeGestionarUsuario`)

- **ADMIN**: gestiona a cualquiera.
- **ASESOR**: solo puede crear/editar OPERARIOS.
- **JEFE_PLANTA**: solo gestiona OPERARIOS de **su mismo título minero**.
- Nadie puede cambiar su propio rol; solo ADMIN puede asignar roles.

### Middlewares de autenticación

`backend/src/middleware/authMiddleware.js`:

```js
authMiddleware       // verifica JWT, carga req.user, bloquea si está inactivo
permisoMiddleware('CREAR_FRI')   // valida acción
tituloMiddleware     // verifica que el usuario pueda acceder al :tituloId del request
roleMiddleware([...]) // legado, basado en roles directos
```

JWT se firma con `JWT_SECRET` y expira en **8 horas**. El frontend programa un `setTimeout` para mostrar el mensaje de sesión expirada y redirigir al login (`api.js → programarCierreSesion`).

### Permisos en el frontend

`frontend/src/utils/permissions.js` replica las reglas para **mostrar/ocultar elementos** y proteger rutas con `<RoleProtectedRoute permiso="..."/>`. Las acciones extra son:

- `VER_PAGINA_FORMULARIOS`, `VER_PAGINA_DASHBOARD`, `VER_PAGINA_REPORTES`, `VER_PAGINA_MAPA`, `VER_PAGINA_USUARIOS`, `VER_PAGINA_OPERACION`
- `VER_PAGINA_CERTIFICADO_ORIGEN`, `VER_GESTOR_ARCHIVOS`

> **Recordatorio:** la verificación en frontend es solo cosmética. La autorización real ocurre siempre en backend.

### Estados de un FRI

```
BORRADOR ─► ENVIADO ─► APROBADO   (no puede modificarse)
                 └──► RECHAZADO
```

Un FRI **APROBADO** queda bloqueado para edición/eliminación (`bloquearSiAprobado` en `server.js`).

---

## Modelo de datos

Esquema en `backend/prisma/schema.prisma`. Tablas principales:

### Núcleo

- `titulos_mineros` — Títulos mineros (con polígono y centroide opcionales para mapas).
- `usuarios` — Cuentas con `rol` y `tituloMineroId` opcional.

### Formularios FRI (10 tipos)

Todos comparten `usuarioId`, `tituloMineroId`, `fechaCorte`, `estado` y `observaciones`:

- `fri_produccion` — Producción por mineral (cantidad, horas, masa unitaria, material que entra/sale planta)
- `fri_inventarios` — Inventarios de acopio (inicial, final, ingreso, salida)
- `fri_paradas` — Paradas de producción (tipo, fecha inicio/fin, motivo)
- `fri_ejecucion` — Ejecución por frente (lat/lng, método, avance, volumen)
- `fri_maquinaria` — Utilización de maquinaria (tipo, horas, capacidad transporte)
- `fri_regalias` — Regalías y declaración (cantidad extraída, valor, resolución UPME)
- `fri_capacidad` — Capacidad tecnológica (área, tecnología, certificaciones)
- `fri_proyecciones` — Proyecciones (capacidad extracción/transporte/beneficio)
- `fri_inventario_maquinaria` — Inventario de maquinaria (marca, modelo, año)

### Operativos (App móvil)

- `puntos_actividad` — Puntos GPS con categoría (`extraccion`, `acopio`, `procesamiento`, `inspeccion`).
- `paradas_actividad` — Paradas con motivo, inicio, fin y cálculo automático de minutos.
- `puntos_items_catalogo`, `maquinaria_catalogo`, `paradas_motivos` — Catálogos.
- `puntos_referencia` — Puntos de referencia georreferenciados por título (con radio de influencia).
- `registro_ciclos_produccion` — Ciclos de producción (transporte de material entre puntos).

### Certificados

- `clientes_compradores` — Clientes (cédula/NIT, contacto, RUCOM).
- `certificados_origen` — Certificados emitidos (mineral, cantidad, ruta a PDF/Excel).

---

## Endpoints de la API

Todos requieren `Authorization: Bearer <token>` salvo `POST /api/auth/login`. Base URL: `/api`.

### Salud y prueba

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Mensaje de servidor |
| GET | `/api/health` | — | Health check |
| GET | `/api/test-db` | — | Verifica conexión PostgreSQL |

### Autenticación (`/api/auth`)

| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Login con `{email, password}` → token + usuario |
| POST | `/auth/register` | `CREAR_USUARIO` | Registra usuario (limitado por `puedeGestionarUsuario`) |
| GET | `/auth/perfil` | auth | Devuelve el perfil del usuario actual |
| PUT | `/auth/perfil` | auth | Actualiza nombre y/o contraseña (requiere password actual) |

### Usuarios (`/api/list-users` y `/api/usuarios`)

| Método | Endpoint | Permiso |
|---|---|---|
| GET | `/list-users` / `/usuarios` | `VER_USUARIOS` |
| GET | `/list-users/:id` | `VER_USUARIOS` |
| POST | `/list-users` | `CREAR_USUARIO` |
| PUT | `/list-users/:id` | `EDITAR_USUARIO` |
| PATCH | `/list-users/:id/status` | `CAMBIAR_ESTADO_USUARIO` |

### Títulos mineros (`/api/titulos`)

| Método | Endpoint | Permiso |
|---|---|---|
| GET | `/titulos-mineros` | auth (filtrado por rol) |
| GET | `/titulos/:id` | auth + `puedeAccederATitulo` |
| POST | `/titulos` | `CREAR_TITULO` |
| PUT | `/titulos/:id` | `EDITAR_TITULO` |

### FRI (todos los tipos siguen el mismo patrón)

Tipos: `produccion`, `inventarios`, `paradas`, `ejecucion`, `maquinaria`, `regalias`, `capacidad`, `proyecciones`, `inventario-maquinaria`.

| Método | Endpoint | Permiso |
|---|---|---|
| POST | `/fri/{tipo}` | `CREAR_FRI` |
| GET | `/fri/{tipo}` | `VER_FRI` |
| PUT | `/fri/{tipo}/:id` | `EDITAR_FRI` (+ no aprobado) |
| DELETE | `/fri/{tipo}/:id` | `ELIMINAR_FRI` (+ no aprobado) |
| PUT | `/fri/:tipo/:id/estado` | `CAMBIAR_ESTADO_FRI` |
| POST | `/fri/enviar-borradores` | `ENVIAR_FRI` |
| GET | `/fri/estadisticas` | auth |
| GET | `/fri/borradores/count` | auth |

### Reportes (`/api/reportes`, `/api/reports`)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/reportes/exportar-anm` | Exporta los 9 archivos Excel oficiales ANM |
| POST | `/reportes/exportar-pdf` | Exporta consolidado PDF |
| GET/POST | `/reports/preview` | Vista previa de reporte |
| GET/POST | `/reports/export` | Descarga Excel filtrado |

### Puntos de actividad (`/api/actividad`)

| Método | Endpoint | Permiso |
|---|---|---|
| GET | `/actividad/items/:categoria` | auth |
| GET | `/actividad/maquinaria` | auth |
| POST | `/actividad/punto` | `CREAR_FORMULARIO_OPERATIVO` |
| PUT | `/actividad/:id` | `EDITAR_FORMULARIO_OPERATIVO` (mismo día) |
| DELETE | `/actividad/:id` | `ELIMINAR_FORMULARIO_OPERATIVO` (mismo día) |
| GET | `/actividad/puntos/:tituloMineroId` | `VER_FORMULARIO_OPERATIVO` |
| GET | `/actividad/estadisticas/:tituloMineroId` | `VER_ESTADISTICAS_OPERATIVAS` |

### Paradas operativas (`/api/paradas`)

| Método | Endpoint | Permiso |
|---|---|---|
| GET | `/paradas/motivos` | auth |
| POST | `/paradas` | `CREAR_FORMULARIO_OPERATIVO` |
| PUT | `/paradas/:id` | `EDITAR_FORMULARIO_OPERATIVO` (mismo día) |
| DELETE | `/paradas/:id` | `ELIMINAR_FORMULARIO_OPERATIVO` (mismo día) |
| GET | `/paradas/resumen/:tituloMineroId` | `VER_ESTADISTICAS_OPERATIVAS` |
| GET | `/paradas/:tituloMineroId` | `VER_FORMULARIO_OPERATIVO` |

### Android / Ciclos de producción (`/api/android`)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/android/puntos/:tituloMineroId` | Puntos de referencia activos |
| POST | `/android/iniciar-registro` | Inicia sesión de registro |
| POST | `/android/registrar-ciclo` | Registra un ciclo individual |
| POST | `/android/registrar-ciclos-batch` | Sincroniza ciclos offline |
| GET | `/android/ciclos-del-dia/:usuarioId/:tituloMineroId` | Ciclos del día |
| GET | `/android/estadisticas/:usuarioId/:tituloMineroId` | Estadísticas (con `?fechaInicio&fechaFin`) |

### Clientes y Certificados de Origen

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/clientes/buscar?cedula=...` | Buscar por cédula o correo |
| POST | `/clientes` | Crear cliente |
| PUT | `/clientes/:id` | Actualizar cliente |
| GET | `/certificados-origen?tituloMineroId=...` | Listar certificados |
| POST | `/certificados-origen` | Crear certificado (genera PDF y XLSX) |
| GET | `/certificados-origen/:id/excel` | Descargar Excel |
| GET | `/certificados-origen/:id/pdf` | Descargar PDF |

### Gestor de archivos (`/api/archivos`)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/archivos` | Listar archivos por mes/título |
| GET | `/archivos/descargar?path=...` | Descarga individual |
| GET | `/archivos/descargar-mes?...` | ZIP de todos los archivos del mes |

### Catálogos de campo (`/api/catalogos-campo`) — solo ADMIN

CRUD del administrador para los catálogos que alimentan los formularios operativos (los desplegables que usan operarios al registrar puntos).

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/catalogos-campo/items?categoria=extraccion` | Listar ítems por proceso (extraccion · acopio · procesamiento · inspeccion) |
| POST | `/catalogos-campo/items` | Crear ítem `{ categoria, codigo, nombre, orden, activo }` |
| PUT | `/catalogos-campo/items/:id` | Editar ítem (campos parciales) |
| DELETE | `/catalogos-campo/items/:id` | Eliminar (soft-delete si está referenciado) |
| GET | `/catalogos-campo/maquinaria` | Listar toda la maquinaria |
| POST | `/catalogos-campo/maquinaria` | Crear `{ codigo, marca, modelo, orden, activo }` |
| PUT | `/catalogos-campo/maquinaria/:id` | Editar |
| DELETE | `/catalogos-campo/maquinaria/:id` | Eliminar (soft-delete si está referenciada) |

> **Eliminación segura:** si un ítem o maquinaria está siendo usado por algún `puntos_actividad`, el endpoint lo desactiva (`activo = false`) en lugar de borrarlo. Solo se borra físicamente cuando no tiene referencias.

---

## Frontend web

Aplicación React montada en `/TU_MINA/` (configurable en `vite.config.js → base`).

### Páginas

| Ruta | Permiso | Descripción |
|---|---|---|
| `/` (Login) | público | Login |
| `/home` | autenticado | Pantalla principal |
| `/formularios` | `VER_PAGINA_FORMULARIOS` | CRUD de FRIs |
| `/dashboard` | `VER_PAGINA_DASHBOARD` | Indicadores FRI |
| `/reportes` | `VER_PAGINA_REPORTES` | Vista previa y exportación |
| `/mapa` | `VER_PAGINA_MAPA` | Mapa de actividades (Leaflet) |
| `/resumen-operacion` | `VER_PAGINA_OPERACION` | Resumen diario operativo |
| `/formularios-operacion` | `VER_PAGINA_OPERACION` | Captura de puntos/paradas |
| `/dashboard-operacion` | `VER_PAGINA_OPERACION` | Estadísticas operativas |
| `/usuarios` | `VER_PAGINA_USUARIOS` | Gestión de usuarios |
| `/catalogos-campo` | `VER_PAGINA_CATALOGOS_CAMPO` | (ADMIN) Maquinaria + ítems por proceso |
| `/certificado-origen` | `VER_PAGINA_CERTIFICADO_ORIGEN` | Emisión de certificados |
| `/gestor-archivos` | `VER_GESTOR_ARCHIVOS` | Descarga de archivos generados |

### Contexto y servicios

- **`TituloContext`** — Para roles globales (ADMIN/ASESOR), guarda el título seleccionado en el header y lo inyecta en todas las consultas.
- **`services/api.js`** — Instancia axios con interceptors para token JWT, anti-caché y manejo de sesión expirada.

### Build de producción

```bash
cd frontend
npm run build           # genera dist/
# desplegar dist/ bajo /TU_MINA en el servidor web
```

---

## App móvil

Expo SDK 54 / React Native 0.81. Pensada para **OPERARIOS** que registran puntos y paradas en campo.

### Pantallas principales

- **Login** — Autenticación
- **Home** — Dashboard del operario
- **RegistrarPunto / EditarPunto** — Captura GPS de actividades (extracción, acopio, etc.)
- **RegistrarParada / EditarParada** — Registro de paradas con motivo
- **HistorialPuntos / HistorialParadas** — Listado del día
- **MapaHistorial** — Vista en mapa (`react-native-maps`)

### Almacenamiento local

`AsyncStorage` con las claves:

```js
@tumina_token
@tumina_user_data
@tumina_pending_ciclos     // sincronización offline
@tumina_last_sync
```

### GPS y sincronización (`SYNC_CONFIG`)

```js
SYNC_INTERVAL: 30s        // intento de sync cada 30 s
MAX_PENDING:   100        // tope de registros offline
GEOFENCE_RADIUS: 50 m
```

### Build de producción

```bash
cd tu-mina-mobile
eas build --platform android
```

`projectId` EAS: `bb635bf8-99f4-4505-a0fa-dd718ae09248` (definido en `app.json`).

---

## Actualizaciones de la app móvil

La app tiene **dos mecanismos de actualización** que conviven y se complementan:

| Ruta | Para qué sirve | Frecuencia típica |
|---|---|---|
| **A — EAS Update (OTA)** | Push de cambios JS/UI sin reinstalar APK | Cualquier cambio en `src/` |
| **B — Version check + APK nuevo** | Forzar/sugerir descarga de APK cuando hay cambios nativos | Cambios en `app.json`, libs nativas, SDK Expo |

### ¿Cuándo necesito generar un APK nuevo?

Heurística: **si tu cambio solo toca archivos dentro de `tu-mina-mobile/src/`, NO necesitas APK nuevo** — basta con `eas update`. Solo necesitas APK nuevo cuando:

| Tipo de cambio | ¿APK nuevo? |
|---|---|
| Editar JSX / lógica / estilos / textos dentro de `src/` | ❌ No — usa EAS Update |
| Agregar lib **pure JS** (`axios`, `date-fns`, `lodash`, etc.) | ❌ No — usa EAS Update |
| Modificar assets referenciados con `require()` | ❌ No — usa EAS Update |
| Editar `app.json` (versión, permisos, plugins, splash) | ✅ Sí |
| Agregar lib con código nativo (`react-native-*`, `expo-*` con módulo nativo) | ✅ Sí |
| Bump del SDK Expo (54 → 55) | ✅ Sí |
| Cambiar `runtimeVersion` o `updates.url` | ✅ Sí |

### Ruta A — EAS Update (push OTA)

Configurado en `app.json`:

```json
"runtimeVersion": { "policy": "appVersion" },
"updates": {
  "url": "https://u.expo.dev/bb635bf8-99f4-4505-a0fa-dd718ae09248",
  "enabled": true,
  "checkAutomatically": "ON_LOAD"
}
```

**Setup inicial** (solo una vez):

```bash
cd tu-mina-mobile
npx expo install expo-updates
eas update:configure
eas build --platform android --profile production   # APK con expo-updates integrado
```

Distribuye ese APK al equipo (es el último APK manual que entregas durante un buen rato).

**Publicar update OTA** (en cualquier cambio JS posterior):

```bash
cd tu-mina-mobile
eas update --branch production --platform android --message "Descripción del cambio"
```

> ⚠️ **Importante**: usa `--platform android` (o `--platform ios`). Sin la flag, EAS intenta empacar también web y falla con `Importing native-only module "react-native/Libraries/Utilities/codegenNativeCommands" on web from: node_modules/react-native-maps/...` porque `react-native-maps` no soporta web. Esta app es solo Android/iOS, no web.

Si necesitas iOS también:

```bash
eas update --branch production --platform ios --message "Descripción del cambio"
```

El equipo recibe el bundle al abrir la app. El modal "Actualización descargada / Reiniciar ahora" aparece automáticamente (configurado en `AppNavigator.js`).

**Ejemplo real** (cambio de logo + textos sin APK nuevo):

```bash
cd tu-mina-mobile
eas update --branch production --platform android --message "Logo GEOGLOBAL en login + textos"
```

### Ruta B — Version check + APK forzado

Cuando un cambio sí requiere APK nuevo, controla el rollout con el endpoint:

```
GET /api/mobile/version    (público, sin auth)
```

Config editable en **`backend/storage/mobile-version.json`**:

```json
{
  "latest": "1.4.0",
  "minimum": "1.2.0",
  "apkUrl": "https://intranet.ctglobal.com.co/documentos/tumina-1.4.0.apk",
  "releaseNotes": "Soporte reprocesamiento, fix sesión expirada"
}
```

**Cómo decide la app**:

| Comparación | Comportamiento |
|---|---|
| `current < minimum` | Modal **bloqueante** — solo botón "Descargar APK", no se puede cerrar |
| `minimum ≤ current < latest` | Modal **sugerente** — botones "Después" y "Descargar" |
| `current ≥ latest` | Silencio — está al día |

**Flujo de release de APK nuevo** (5 pasos):

1. **Bump versión** en `tu-mina-mobile/app.json`:
   ```json
   "version": "1.4.0"
   ```
2. **Build APK**:
   ```bash
   cd tu-mina-mobile
   eas build --platform android --profile production
   ```
3. **Subir APK** a `https://intranet.ctglobal.com.co/documentos/tumina-1.4.0.apk`.
4. **Editar `backend/storage/mobile-version.json`** con los nuevos valores:
   - `latest` → la versión nueva.
   - `minimum` → déjala igual si solo quieres **sugerir**; súbela si quieres **forzar**.
   - `apkUrl` → URL del APK recién subido.
   - `releaseNotes` → texto corto que verá el usuario en el modal.
5. **Reiniciar backend** (o esperar — el endpoint relee el JSON en cada request, no necesita restart):
   ```bash
   ssh vps "pm2 restart tumina-backend"
   ```

El equipo verá el modal al abrir la app o al volver del background.

### ¿Cómo elijo entre "sugerir" y "forzar"?

| Quiero... | Edito `mobile-version.json` así |
|---|---|
| **Sugerir** descarga (usuario puede aplazar) | Subir `latest`, dejar `minimum` igual |
| **Forzar** descarga (bloquea uso de versiones viejas) | Subir `latest` y `minimum` a la misma versión nueva |
| **Forzar solo a usuarios muy desactualizados** | Subir `latest` a la nueva, `minimum` a una intermedia |

### Resumen de qué pasa al abrir la app

1. **OTA check** (Ruta A) — descarga bundle JS si hay update.
2. **Token check** — si el JWT expiró, redirige al Login.
3. **Version check** (Ruta B) — consulta `/api/mobile/version` y muestra modal si corresponde.

Los tres flujos también re-corren cuando la app vuelve del background (`AppState → active`).

---

## Reportes y archivos

### Excel oficiales ANM

`POST /api/reportes/exportar-anm` genera los 9 archivos según las plantillas oficiales:

```
ANM - FRI - Materiales de Construccion - Capacidad Tecnologica 816-17.xlsx
ANM - FRI - Materiales de Construccion - Ejecucion 816-17.xlsx
ANM - FRI - Materiales de Construccion - Inventario de Maquinaria 816-17.xlsx
ANM - FRI - Materiales de Construccion - Inventarios 816-17.xlsx
ANM - FRI - Materiales de Construccion - Paradas de produccion 816-17.xlsx
ANM - FRI - Materiales de Construccion - Produccion 816-17.xlsx
ANM - FRI - Materiales de Construccion - Proyecciones 816-17.xlsx
ANM - FRI - Materiales de Construccion - Regalias 816-17.xlsx
ANM - FRI - Materiales de Construccion - Utilizacion de Maquinaria de transporte 816-17.xlsx
```

### Certificados de origen

Generados con `pdfkit` y `exceljs` (firma + logo en `backend/storage/`). Los archivos resultantes se sirven desde `backend/storage/certificados/`.

### Gestor de archivos

Permite navegar y descargar los archivos generados, agrupados por **mes / título**, con opción de descargar todo el mes en un ZIP (`archiver`).

### Zona horaria

Todas las fechas se manejan en **hora Colombia (UTC-5)**. Helpers `colombiaToday()` y `toColombiaStr()` garantizan que los timestamps no sufran conversión por la base de datos. Los certificados PDF/Excel imprimen la fecha local Colombia, no UTC.

---

## Despliegue en producción

### Servidor (VPS Hostinger)

- IP: `200.7.107.14`
- Backend: `https://api.ctglobal.com.co/api` (proxy a `:3001`)
- Frontend: `https://ctglobal.com.co/TU_MINA`

### CORS

Lista blanca configurada en `backend/src/server.js`. Para añadir un nuevo origen, edita el array dentro de `app.use(cors({ origin: [...] }))`.

### Comandos útiles

```bash
# Backend (con PM2)
pm2 start src/server.js --name tu-mina-api
pm2 logs tu-mina-api

# Migraciones en producción
npx prisma migrate deploy
npx prisma generate

# Verificar conexión BD
node -e "require('@prisma/client'); console.log('OK')"
```

### Cambio de puertos

`scripts/cambiar_puertos.sh` automatiza el cambio de puertos en backend y frontend si el VPS los reasigna.

---

## Estructura del repositorio

```
TUMINA-main/
├─ backend/
│  ├─ prisma/              # schema, migraciones, seeds
│  ├─ src/
│  │  ├─ server.js         # bootstrap + rutas FRI/usuarios/títulos
│  │  ├─ middleware/       # authMiddleware, permisoMiddleware, tituloMiddleware
│  │  ├─ utils/permissions.js   # roles + acciones
│  │  ├─ controllers/      # android, paradas, puntos, certificados, archivos, reportes
│  │  ├─ routes/           # routers separados por dominio
│  │  ├─ services/         # excelReports, pdfExporter, certificados, storage
│  │  └─ templates/        # plantillas Excel ANM
│  └─ storage/             # certificados generados, firma, logo
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx           # rutas + RoleProtectedRoute
│  │  ├─ pages/            # 12 páginas
│  │  ├─ context/TituloContext.jsx
│  │  ├─ services/api.js   # axios + auth
│  │  └─ utils/permissions.js
│  └─ vite.config.js       # base /TU_MINA + proxy /api → :3001
├─ tu-mina-mobile/
│  ├─ App.js, app.json, eas.json
│  └─ src/
│     ├─ navigation/AppNavigator.js
│     ├─ screens/          # Login, Home, RegistrarPunto, ...
│     ├─ services/api.js
│     └─ utils/constants.js  # API_BASE_URL, ENDPOINTS, GPS_CONFIG
├─ datos/                  # archivos Excel base (ANM + usuarios)
├─ scripts/cambiar_puertos.sh
└─ README.md
```

---

## Soporte

Repositorio mantenido por **CT Global** — `direccion@ctglobal.com.co`.


cd /srv/anm-fri-backend
pm2 restart tumina-backend
