# IntelItalia

**IntelItalia** es una plataforma de centralización de datos y alertas de seguimiento estudiantil, desarrollada a medida para la **Escuela Básica República de Italia** (Coquimbo). Es un proyecto universitario en modalidad A+S y cubre PK, K y 1° a 8° básico.

## Propósito

Hoy la escuela maneja la asistencia, las notas y las evaluaciones externas en sistemas separados. IntelItalia reúne esa información por alumno a partir de los archivos que la escuela ya recibe:

- **Mi Aula:** notas y asistencia. Sigue siendo el sistema donde se registran; la plataforma solo importa sus exportaciones.
- **DIA:** resultados por eje en Lenguaje y Matemática.
- **Letrapps:** velocidad y calidad lectora.
- **SEPA:** en 2° básico.

Con esos datos, la plataforma busca dar a la directiva y a los docentes **alertas tempranas** de inasistencia y bajo rendimiento, con prioridad en Lenguaje y Matemática y con umbrales que la escuela puede configurar.

## Estado actual

| Área | Implementado | Pendiente |
|------|--------------|-----------|
| Base | Infraestructura con Docker Compose y CI; cursos, asignaturas y alumnos; semilla con datos ficticios | — |
| Acceso | Login con Google y lista blanca de correos; sesión con cookie httpOnly; roles y permisos editables; administración de usuarios (API) | 7 de los 9 roles; pantallas de administración |
| Lectura | Cursos, alumnos por curso y ficha del alumno, con alcance por curso y auditoría | Notas, asistencia y alertas en la ficha |
| Cargas | Carga del DIA con vista previa, resolución de filas dudosas y confirmación | Letrapps; Mi Aula y SEPA, a la espera del formato real |
| Alertas | — | Motor de alertas y reglas configurables |
| Frontend | Inicio de sesión con Google conectado a la API y rutas protegidas | Cursos, ficha, cargas, dashboard y administración |

El diseño completo, lo que falta y las decisiones tomadas están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Stack

Monorepo sin `package.json` raíz: cada carpeta se instala y se ejecuta por separado.

| Parte | Tecnología |
|-------|------------|
| Backend | NestJS 11 + TypeScript, MongoDB (Mongoose), Redis + BullMQ |
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS, React Router |
| Despliegue | Docker Compose (MongoDB, Redis, API y Nginx). El hosting está por definir |

## Estructura del repositorio

```text
IntelItalia/
├── backend/                 # API REST (NestJS)
│   ├── src/                 # un módulo por carpeta: alumnos, cursos, cargas, fichas, usuarios…
│   └── test/                # tests e2e (MongoDB en memoria)
├── frontend/                # SPA (React + Vite), servida con Nginx en Docker
├── docker/mongo/            # script que crea el usuario de la app en MongoDB
├── docs/ARQUITECTURA.md     # fuente de verdad del diseño
├── docker-compose.yml       # todo el sistema, como en el servidor
├── docker-compose.dev.yml   # publica MongoDB y Redis en 127.0.0.1 para desarrollar
└── .env.example             # variables de entorno (copiar a .env)
```

## Puesta en marcha (desarrollo)

Requisitos: Node.js 22, Docker Desktop y un Client ID de OAuth de Google ("Aplicación web") con `http://localhost:5173` en sus orígenes autorizados.

1. **Variables de entorno.** Copiar `.env.example` a `.env` y completarlo. Para generar `JWT_SECRETO`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   En `CORREO_DIRECTORA_INICIAL` va el correo de quien va a entrar primero. Además, crear `frontend/.env` con `VITE_GOOGLE_CLIENT_ID=<el mismo Client ID>` (Vite no lee el `.env` de la raíz).

2. **MongoDB y Redis** (solo en `127.0.0.1`):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo redis
   ```

   Si el puerto 27017 está ocupado, probablemente hay un MongoDB instalado en Windows: detenerlo con `Stop-Service MongoDB` (PowerShell como administrador).

3. **Backend:**

   ```bash
   cd backend
   npm ci
   npm run semilla -- 2026   # datos FICTICIOS: asignaturas, cursos PK–8° y alumnos. Nunca en producción
   npm run start:dev         # http://localhost:3000/api/salud
   ```

4. **Frontend:**

   ```bash
   cd frontend
   npm ci
   npm run dev               # http://localhost:5173
   ```

Para levantar todo en Docker, como en el servidor: `docker compose up -d --build` (queda en `http://localhost:8080`). El login con Google todavía no funciona en ese modo, porque falta pasarle `VITE_GOOGLE_CLIENT_ID` al build del frontend.

## Comandos útiles

| Carpeta | Comando | Qué hace |
|---------|---------|----------|
| `backend` | `npm run lint:check` | ESLint sin corregir (lo que corre el CI); `npm run lint` corrige |
| `backend` | `npm test` | Tests unitarios (Jest) |
| `backend` | `npm run test:e2e` | Tests e2e con MongoDB en memoria |
| `backend` | `npm run build` | Compila la API |
| `frontend` | `npm run lint` | ESLint |
| `frontend` | `npm run build` | Verifica los tipos y compila |

El CI (`.github/workflows/ci.yml`) corre lint, build y tests de ambas carpetas en cada pull request.

## Forma de trabajo

- Las ramas de tareas de Jira empiezan con la clave del issue (`PGT-42-infraestructura-base`); los commits, en español y en infinitivo (`PGT-42 Agregar docker compose`).
- Todo cambio entra a `master` por pull request.
- Las dependencias se instalan con `npm install` y se commitean `package.json` y `package-lock.json` juntos.

## Privacidad

El sistema trata datos de menores, algunos sensibles (PIE y observaciones psicosociales), bajo la Ley 21.719. **Nunca se suben** archivos `.env`, credenciales ni archivos con datos reales de alumnos: para desarrollar y probar se usan datos ficticios. Las reglas completas están en la sección 8 de [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
