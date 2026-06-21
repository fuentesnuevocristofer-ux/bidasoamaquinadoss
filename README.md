# BIDASOA – Sistema de Control de Maquinados
### Plataforma Corporativa de Gestión de Manufactura · Taller MAQUINADOS

---

## 🏭 Descripción del Proyecto

Sistema web corporativo para el control y gestión de envío de trabajos de la **Manufacturera de Papel Bidasoa** hacia el **Taller de Maquinados**, que cuenta con **4 tornos activos**. Diseñado con interfaz ejecutiva premium para presentación ante junta directiva.

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticación y Roles (RBAC)
- Login corporativo con validación de credenciales
- **Rol Administrador**: Acceso total al sistema
- **Rol Operador/Realizador**: Vista restringida según permisos configurados por el Admin
- Persistencia de sesión en `localStorage`

**Credenciales por defecto:**
| Usuario | Contraseña | Rol | Torno |
|---------|-----------|-----|-------|
| `admin` | `admin123` | Administrador | Todos |
| `torno1` | `torno1` | Operador | Torno 1 |
| `torno2` | `torno2` | Operador | Torno 2 |
| `torno3` | `torno3` | Operador | Torno 3 |
| `torno4` | `torno4` | Operador | Torno 4 |

### 📊 Panel del Administrador
- **Dashboard General** con KPIs (Total, En Proceso, Urgentes, Terminados)
- **Estado por Torno** con barras de progreso visuales
- **Últimos trabajos ingresados**

### 📋 Gestión de Trabajos
- Formulario completo con todos los campos técnicos:
  - N° Maquinado (ID único), Solicitante, Área, Equipo/Máquina
  - Selector de 4 tornos, Material, Operador asignado
  - Urgencia (Urgente 🔴 / Medianamente Urgente 🟡 / Poco Urgente 🟢)
  - Fechas de ingreso y entrega, tiempo estimado
  - Carga de planos y archivos de diseño (PDF, DWG, DXF, STEP, imágenes)
  - Descripción detallada
- Tabla dinámica con filtros por Torno, Estado y Urgencia
- Búsqueda en tiempo real
- Acciones: Ver detalle, Editar, Eliminar (solo Admin)

### 🔃 Priorización con Drag & Drop
- Pestañas por torno (Torno 1 – 4)
- Arrastrar y soltar tarjetas para reordenar prioridades (solo Administrador)
- Reajuste automático de números de prioridad al mover
- Guardado automático en localStorage

### 📥 Importación Masiva
- Soporte para archivos `.xlsx`, `.xls`, `.csv`
- Vista previa de datos antes de confirmar importación
- Detección de duplicados por N° Maquinado
- **Descarga de plantilla oficial** en formato Excel
- Zona de drag & drop para soltar archivos

### 📈 Módulo de Reportes Ejecutivos
- **Reporte Diario**: Actividades del día actual
- **Reporte Semanal**: Últimos 7 días
- **Reporte Mensual**: Mes en curso
- **Informe General del Proyecto**: Todos los datos + KPIs completos
- Formatos disponibles: **PDF** (impresión), **Excel** (.xlsx), **Word** (.doc)
- Incluye: KPIs, distribución por torno, detalle de trabajos, observaciones

### 👷 Panel del Operador (Vista de Taller)
- Lista de trabajo ordenada por prioridad asignada por Admin
- Solo ve su torno asignado (excepto si Admin otorga permiso de ver otros)
- Alertas de color por urgencia: 🔴 Urgente, 🟡 Media, 🟢 Baja
- Alerta visual de fechas vencidas o por vencer
- **Botón "Dar por Terminado"**
- **Agregar Evidencia**: Fotos del maquinado finalizado
- **Campo de Observaciones**: Comentarios sobre el proceso
- Descarga de reporte de su propio torno

### 👥 Gestión de Usuarios y Permisos
- Crear, editar y eliminar usuarios
- Asignación de rol y torno
- **Permisos granulares por operador**:
  - Ver Planos/Archivos
  - Descargar Planos
  - Ver Otros Tornos
  - Agregar Observaciones
  - Agregar Evidencia
  - Descargar Reportes

---

## 🗂️ Estructura de Archivos

```
index.html          — Página principal (login + app completa)
css/
  style.css         — Estilos corporativos ejecutivos
js/
  app.js            — Core: autenticación, navegación, estado, reloj
  admin.js          — Panel administrador: trabajos, priorización, usuarios, importar
  operador.js       — Panel operador: mi torno, evidencia, terminar trabajo
  reportes.js       — Generación de PDF, Excel y Word
README.md
```

---

## 🗄️ Modelo de Datos

### Tabla: `trabajos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | text | UUID único |
| numero_maquinado | text | Identificador del trabajo (ej: MAQ-2026-001) |
| solicitante | text | Persona que solicita |
| area_solicitante | text | Área de origen |
| equipo_maquina | text | Máquina que requiere la pieza |
| torno_asignado | text | Torno 1–4 |
| material | text | Material requerido |
| urgencia | text | Urgente / Medianamente Urgente / Poco Urgente |
| fecha_ingreso | text | YYYY-MM-DD |
| fecha_entrega | text | YYYY-MM-DD |
| prioridad | number | Orden de prioridad por torno |
| estado | text | Pendiente / En Proceso / Terminado / Cancelado |
| descripcion | rich_text | Descripción técnica |
| observaciones | rich_text | Observaciones del operador |
| planos_archivos | array | Nombres de archivos adjuntos |
| evidencias | array | Fotografías del trabajo terminado |
| operador_asignado | text | Nombre del operador |
| fecha_terminado | text | Fecha real de terminación |
| tiempo_estimado | number | Horas estimadas |
| tiempo_real | number | Horas reales |

### Tabla: `usuarios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | text | UUID único |
| nombre | text | Nombre completo |
| username | text | Usuario de login |
| password | text | Contraseña |
| rol | text | admin / operador |
| torno_asignado | text | Torno 1–4 o Todos |
| activo | bool | Estado del usuario |
| permisos | text | JSON de permisos |

> **Almacenamiento:** Los datos se persisten en `localStorage` del navegador. La estructura de tablas está definida en el sistema de Tables API del proyecto.

---

## 🎨 Diseño y UX

- **Paleta corporativa:** Azul marino `#0d2a6b`, blancos y grises ejecutivos
- **Tipografía:** Inter (Google Fonts) – clean y moderna
- **Badges de urgencia:** Rojo 🔴 Urgente, Amarillo 🟡 Media, Verde 🟢 Baja
- **Responsive:** Adaptado a desktop, tablet y móvil
- **Iconografía:** Font Awesome 6
- **Animaciones:** Transiciones suaves y fade-in en paneles
- **Drag & Drop:** SortableJS para priorización

---

## 🔗 Rutas del Sistema (URI)

| Ruta | Descripción |
|------|-------------|
| `/` o `index.html` | Pantalla de login |
| `#dashboard` | Dashboard general (Admin) |
| `#trabajos` | Gestión de trabajos (Admin) |
| `#priorizacion` | Priorización drag & drop (Admin) |
| `#importar` | Importación masiva (Admin) |
| `#reportes` | Módulo de reportes (Admin) |
| `#usuarios` | Gestión de usuarios y permisos (Admin) |
| `#mi-torno` | Vista de torno (Operador) |
| `#op-reportes` | Reportes del operador (Operador) |

---

## 🚀 Próximas Mejoras Sugeridas

1. **Backend API real** (Node.js / Express) para persistencia en servidor
2. **Subida real de archivos** (planos, evidencias) a almacenamiento en la nube
3. **Notificaciones en tiempo real** (WebSockets) para alertas de nuevos trabajos
4. **Gráficas estadísticas** con Chart.js / ECharts en el dashboard
5. **Historial de cambios** por trabajo con registro de auditoría
6. **Calendario de entregas** con vista mensual por torno
7. **Sistema de comentarios** colaborativo por trabajo
8. **Exportación de planos** y acceso controlado por archivo

---

## 🏢 Información del Proyecto

- **Empresa:** Manufacturera de Papel Bidasoa
- **Taller:** Maquinados (4 tornos)
- **Versión:** 1.0.0
- **Año:** 2026
- **Tipo:** Plataforma web estática corporativa

---

*© 2026 Manufacturera de Papel Bidasoa · Sistema de Control de Maquinados · Acceso Restringido*
