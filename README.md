# segsoft-frontend

Interfaz web de **SegSoft** — plataforma de análisis de cumplimiento de seguridad para repositorios de código fuente. Proyecto de grado (PDG) — Universidad Icesi.

## Descripción

SPA construida con React y Vite que permite gestionar políticas de seguridad, subir repositorios, ejecutar análisis y visualizar los hallazgos por categoría y severidad.

## Tecnologías

| Componente | Versión |
|---|---|
| React | 18 |
| TypeScript | 5 |
| Vite | 5 |
| React Router | 6 |
| Tailwind CSS | 3 |

## Requisitos previos

- Node.js 18 o superior
- Backend Spring corriendo en `http://localhost:8080` (ver `segsoft-backend`)

## Cómo ejecutar

```bash
npm install       # solo la primera vez
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Credenciales de desarrollo

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Security Admin |
| `auditor` | `auditor123` | Auditor |
| `dev` | `dev123` | Developer |

## Funcionalidades

- **Autenticación** — login/logout con JWT, refresco automático de sesión
- **Repositorios** — subida de ZIP o clonado desde URL Git, inventario de archivos
- **Políticas** — catálogo de políticas de seguridad por categoría y framework (OWASP, ISO 27001, ASVS, DevSecOps)
- **Selección de políticas** — asignar qué políticas aplican a cada repositorio antes del análisis
- **Análisis** — ejecución de análisis de cumplimiento, seguimiento de progreso en tiempo real
- **Resultados** — dashboard por política y categoría, tabla de hallazgos con filtros por severidad, categoría y ruta de archivo
- **Detalle de finding** — panel lateral con evidencia, CWE, severidad y acción sugerida
- **Navegación rápida** — el menú "Análisis" redirige automáticamente al último análisis visto

## Estructura del proyecto

```
src/
├── api/              # Clientes HTTP (auth, analyses, findings, policies, repositories)
├── components/
│   ├── auth/         # LoginForm, ProtectedRoute
│   ├── layout/       # AppLayout, Sidebar, Header
│   ├── policies/     # PolicyListPage, PolicyDetailPage
│   ├── repositories/ # FileInventory, PolicySelectionView
│   └── results/      # ResultsDashboard, FindingsTable, FindingDetailPanel, FindingsFilters
├── pages/
│   ├── DashboardPage.tsx
│   └── analysis/
│       └── AnalysisResultsPage.tsx
├── router/
│   └── AppRouter.tsx # Definición de rutas
├── store/
│   └── authStore.tsx # Estado global de autenticación + último análisis
├── types/            # Tipos TypeScript de la API
└── utils/            # tokenStorage, http client con interceptores
```

## Variables de entorno

Crear un archivo `.env.local` para sobreescribir la URL del backend:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Por defecto apunta a `http://localhost:8080`.
