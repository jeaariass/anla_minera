# 🔍 VERIFICAR DATOS EN LA BASE DE DATOS

## 📦 Archivos Descargados

1. ✅ **verificar-datos.js** - Script principal
2. ✅ **ver-datos.sql** - Script SQL directo
3. ✅ **verificar-conexion.bat** - Automatización para Windows
4. ✅ **verificar-conexion.sh** - Automatización para Linux/Mac
5. ✅ **CONECTAR_BASE_DATOS.md** - Guía completa
6. ✅ **README.md** - Este archivo

---

## ⚡ USO RÁPIDO (Elige uno)

### OPCIÓN A: Windows (Más fácil)

1. Copia todos los archivos a tu carpeta `backend/`
2. Haz doble clic en: **`verificar-conexion.bat`**
3. Lee el resultado

### OPCIÓN B: Terminal (Windows/Mac/Linux)

```bash
# 1. Copia verificar-datos.js a tu carpeta backend
cp verificar-datos.js /ruta/a/tu/proyecto/backend/

# 2. Ve a la carpeta backend
cd backend

# 3. Ejecuta
node verificar-datos.js
```

### OPCIÓN C: SQL Directo

```bash
# 1. Conecta a PostgreSQL
psql -U postgres -d anm_fri_db

# 2. Ejecuta
\i ver-datos.sql
```

---

## 📊 QUÉ VAS A VER

El script te mostrará:

✅ Si la conexión a PostgreSQL funciona
✅ Cuántos usuarios tienes en el sistema
✅ Cuántos títulos mineros hay
✅ **TODOS los datos de FRI Inventario Maquinaria**
✅ **TODOS los datos de FRI Proyecciones**
✅ Estadísticas por estado (BORRADOR, ENVIADO, etc.)

**Ejemplo de salida:**

```
🔍 VERIFICANDO CONEXIÓN A LA BASE DE DATOS...

═══════════════════════════════════════════════════════════
✅ CONEXIÓN EXITOSA a la base de datos PostgreSQL

👥 Total usuarios en el sistema: 3
📜 Total títulos mineros: 2

═══════════════════════════════════════════════════════════

📊 DATOS EN FRI INVENTARIO MAQUINARIA:

────────────────────────────────────────────────────────────
✅ 5 registro(s) encontrado(s):

   1. Excavadora
      📅 Fecha: 2025-11-01
      🏭 Marca: Caterpillar
      🔧 Modelo: 320D
      📆 Año: 2020
      ⚙️  Estado: Operativo
      📋 Estado Formulario: BORRADOR
      👤 Usuario: Juan Pérez
      📜 Título: TEST-001
```

---

## ❌ SI ALGO NO FUNCIONA

### Error: "Cannot find module '@prisma/client'"

**Solución:**
```bash
cd backend
npm install
npx prisma generate
node verificar-datos.js
```

### Error: "Connection refused"

**Solución:** PostgreSQL no está corriendo

```bash
# Windows
net start postgresql-x64-14

# Linux/Mac
sudo service postgresql start
```

### Error: "database does not exist"

**Solución:**
```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE anm_fri_db;"

# Ejecutar migraciones
cd backend
npx prisma migrate dev
```

---

## 🎯 SIGUIENTE PASO

Una vez que ejecutes el script y veas tus datos:

### SI VES DATOS ✅
**Perfecto!** Tus datos están guardados. 
El problema es solo la conexión entre el frontend y backend.

**Dime:** ¿Cuántos registros ves?

### SI NO VES DATOS ⚠️
Hay que verificar:
1. Que la base de datos exista
2. Que las migraciones se hayan ejecutado
3. Que realmente hayas guardado datos antes

**Dime:** ¿Qué mensaje de error ves?

---

## 💡 TIPS

1. **Ejecuta este script PRIMERO** antes de intentar arreglar el frontend
2. **Anota cuántos registros tienes** en cada tabla
3. Si ves tus datos aquí, entonces el problema es solo el frontend

---

## 📞 ¿QUÉ HACER DESPUÉS?

1. **Ejecuta el script**
2. **Toma captura de pantalla** del resultado
3. **Dime qué viste**
4. Continuamos desde ahí con la solución correcta

---

**Tiempo estimado:** 2-5 minutos  
**Dificultad:** Muy fácil  
**Objetivo:** Ver si tus datos están realmente en la BD
