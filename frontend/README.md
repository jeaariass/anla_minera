# Sistema ANM-FRI Frontend

Frontend moderno para el Sistema de Formularios de Recolección de Información (FRI) de la Agencia Nacional de Minería (ANM) desarrollado para CTGlobal.

## 🚀 Características

### 1. **Login Seguro**
- Autenticación con JWT
- Validación de usuarios desde la base de datos
- Diseño moderno con animaciones

### 2. **Home Dashboard**
- Información de la empresa y usuario
- Resumen de estadísticas generales
- Accesos rápidos a las 3 funcionalidades principales
- KPIs dinámicos

### 3. **Gestión de Formularios**
- **6 tipos de formularios FRI disponibles:**
  - 🏭 FRI Producción (Mensual)
  - 📦 FRI Inventarios (Mensual)
  - ⏸️ FRI Paradas de Producción
  - ⚙️ FRI Ejecución (Mensual)
  - 🚜 FRI Utilización de Maquinaria
  - 💰 FRI Regalías (Trimestral)
- Crear, listar, editar y eliminar formularios
- Validación en tiempo real
- Estados de workflow (Borrador, Enviado, Aprobado, Rechazado)

### 4. **Dashboard Analítico**
- **KPIs en tiempo real:**
  - Producción total
  - Inventario actual
  - Paradas totales
  - Eficiencia operativa
- **Gráficos interactivos:**
  - Producción mensual vs meta (Gráfico de líneas)
  - Distribución por mineral (Gráfico de torta)
  - Estado de formularios (Gráfico de barras)
- Tabla de últimas paradas de producción
- Resumen estadístico por mineral

### 5. **Exportación de Reportes**
- **Filtros avanzados:**
  - Rango de fechas
  - Tipos de formularios
  - Tipos de materiales
- **Formatos de exportación:**
  - 📊 Excel: Formato simple con columnas ANM
  - 📄 PDF: Reporte ejecutivo con gráficos
- Vista previa antes de exportar
- Descarga directa de archivos

## 🛠️ Tecnologías Utilizadas

- **React 18** - Framework de interfaz de usuario
- **React Router DOM** - Navegación entre páginas
- **Axios** - Cliente HTTP para API REST
- **Recharts** - Librería de gráficos
- **Lucide React** - Iconos modernos
- **Vite** - Build tool y servidor de desarrollo
- **CSS3** - Estilos personalizados modernos

## 📋 Requisitos Previos

- Node.js 16+ instalado
- Backend ANM-FRI corriendo en `http://localhost:5000`
- PostgreSQL configurado con la base de datos `anm_fri_db`

## 🔧 Instalación

1. **Clonar o descargar el proyecto**
```bash
cd anm-frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno** (opcional)
Si tu backend está en otro puerto, edita el archivo `vite.config.js`:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:TU_PUERTO',
    changeOrigin: true,
  }
}
```

4. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## 📦 Construir para Producción

```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/`

## 🎨 Estructura del Proyecto

```
anm-frontend/
├── src/
│   ├── assets/           # Recursos estáticos
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas principales
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── Home.jsx
│   │   ├── Home.css
│   │   ├── Formularios.jsx
│   │   ├── Formularios.css
│   │   ├── Dashboard.jsx
│   │   ├── Dashboard.css
│   │   ├── Reportes.jsx
│   │   └── Reportes.css
│   ├── services/        # Servicios y API
│   │   └── api.js
│   ├── utils/           # Utilidades
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Punto de entrada
│   └── index.css        # Estilos globales
├── index.html           # HTML principal
├── vite.config.js       # Configuración de Vite
└── package.json         # Dependencias

```

## 👥 Usuarios de Prueba

**Administrador:**
- Email: `admin@anm.gov.co`
- Contraseña: `password123`

**Supervisor:**
- Email: `supervisor@empresa.com`
- Contraseña: `password123`

**Operador:**
- Email: `operador@empresa.com`
- Contraseña: `password123`

## 🔐 Sistema de Roles

- **ADMIN**: Acceso completo a todas las funcionalidades
- **SUPERVISOR**: Puede aprobar/rechazar formularios y ver reportes
- **OPERADOR**: Puede crear y editar formularios

## 🎯 Flujo de Trabajo

1. **Login** → Autenticación con credenciales
2. **Home** → Vista general con estadísticas y accesos rápidos
3. **Opciones:**
   - **Formularios** → Crear/Ver formularios FRI
   - **Dashboard** → Ver análisis y gráficos
   - **Reportes** → Exportar datos con filtros

## 📊 Endpoints de la API

El frontend se conecta con los siguientes endpoints:

- `POST /api/auth/login` - Autenticación
- `GET /api/fri/produccion` - Obtener formularios de producción
- `POST /api/fri/produccion` - Crear formulario de producción
- `GET /api/reportes/dashboard` - Obtener estadísticas del dashboard
- `POST /api/reportes/export/excel` - Exportar a Excel
- `POST /api/reportes/export/pdf` - Exportar a PDF

## 🎨 Paleta de Colores

- **Primary**: #2563eb (Azul)
- **Secondary**: #10b981 (Verde)
- **Danger**: #ef4444 (Rojo)
- **Warning**: #f59e0b (Naranja)
- **Dark**: #1f2937 (Gris oscuro)

## 📱 Responsive Design

El frontend está completamente optimizado para:
- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🐛 Solución de Problemas

**Error de conexión con el backend:**
- Verifica que el backend esté corriendo
- Revisa el puerto en `vite.config.js`

**Error de autenticación:**
- Verifica que los usuarios existan en la base de datos
- Revisa que el token JWT esté configurado correctamente

**Gráficos no se muestran:**
- Verifica que recharts esté instalado: `npm install recharts`

## 📝 Notas de Desarrollo

- El frontend usa localStorage para almacenar el token JWT
- Las rutas están protegidas con ProtectedRoute
- Los formularios tienen validación en tiempo real
- Los datos de los gráficos son mock data si falla la conexión con el backend

## 🔄 Próximas Mejoras

- [ ] Implementar modo oscuro
- [ ] Agregar más tipos de gráficos
- [ ] Sistema de notificaciones push
- [ ] Soporte offline con Service Workers
- [ ] Exportación a más formatos (CSV, JSON)
- [ ] Editor de formularios dinámico
- [ ] Sistema de permisos granulares por campo

## 👨‍💻 Autores

Desarrollado como parte del proyecto de pasantía en CTGlobal para la Agencia Nacional de Minería (ANM).

## 📄 Licencia

Este proyecto es propiedad de CTGlobal y la Agencia Nacional de Minería.

---

**¡Gracias por usar el Sistema ANM-FRI!** 🎉
