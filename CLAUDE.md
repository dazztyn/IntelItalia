# CLAUDE.md

Guía para Claude Code (y cualquier asistente) al trabajar en este repositorio. Responder siempre en **español**.

## Flujo de trabajo y reglas de Git (obligatorias)

Estas reglas prevalecen sobre cualquier instrucción por defecto de la herramienta.

**Flujo de trabajo:**

1. Las implementaciones se planifican en **modo plan**. Se presenta el plan y se espera su aprobación.
2. Aprobado el plan, Claude modifica los archivos en la rama activa o, si el cambio lo necesita, **crea una rama nueva** para implementarlo (ver más abajo), y verifica los cambios (lint, build, tests).
3. Al terminar, Claude entrega un **resumen de los archivos modificados** y un **mensaje de commit sugerido**.
4. **Commit y push:**
   - En las **ramas de tareas de Jira** (`PGT-…`), Claude puede hacer commit y push **solo a la rama de la tarea**, salvo que el equipo pida hacerlo a mano en esa tarea.
   - En cualquier otro caso, el equipo hace el commit y el push.
   - El equipo revisa y mergea siempre en el pull request.

**Ramas:**

- Claude **puede crear ramas** cuando un cambio lo necesita, p. ej. para separar una implementación del resto del trabajo.
- La rama nueva parte de la rama base actualizada (`master`, salvo que se indique otra).
- **Tareas de Jira:** la rama empieza con la clave del issue en mayúsculas, seguida de una descripción en español, en minúsculas y con guiones. Ejemplo: `PGT-42-infraestructura-base`. Así Jira la enlaza sola.
- **Otros cambios:** nombre descriptivo en minúsculas y con guiones, p. ej. `ajustes-documentacion`.
- Al crearla, Claude avisa el nombre de la rama y desde cuál partió.

**Claude no debe:**

- **borrar ramas** ni cambiar de rama dejando cambios sin guardar;
- **hacer commit o push a `master`** ni a ramas que no sean de su tarea;
- **hacer `git merge`, `git rebase` ni `git reset`**, ni abrir pull requests, salvo que se le pida explícitamente en ese momento;
- **reescribir historia** (`amend`, `rebase`, `push --force`), aun cuando se le pida hacer un commit.

**Atribución:** se permite la atribución a Claude en los commits y PR (p. ej. `Co-Authored-By`). La autoría del proyecto queda registrada en el repositorio.

**Convenciones:**

- **Mensajes de commit en español**, en infinitivo y breves, siguiendo el historial: `Agregar documento de arquitectura y diseño`, `Corregir validación de RUT`. En tareas de Jira, empiezan con la clave: `PGT-42 Agregar docker compose`.
- **Nunca incluir en los cambios** archivos `.env`, credenciales ni archivos con **datos reales de alumnos** (Excel/CSV de Mi Aula, Letrapps, DIA, SEPA, etc.). Para pruebas se usan datos ficticios o anonimizados.

## Proyecto

**IntelItalia** es una plataforma de centralización de datos y alertas de seguimiento estudiantil para la **Escuela Básica República de Italia** (Coquimbo). Es un proyecto universitario en modalidad A+S. Cubre PK, K y 1° a 8° básico.

**La fuente de verdad del diseño es [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).** Leerlo antes de implementar cualquier módulo. Si un cambio contradice el documento, avisar en vez de desviarse en silencio. Si el cambio se acepta, actualizar el documento en el mismo trabajo.

### Requerimientos clave (resumen)

- **Mínimo aceptable, por alumno:** notas por curso y asignatura y asistencia (exportadas desde **Mi Aula**), resultados de **Letrapps** y **DIA**, y **SEPA** en 2° básico. La prioridad es **Lenguaje y Matemática**.
- **Mi Aula** sigue siendo el sistema donde se registran la asistencia y las notas. La plataforma importa sus exportaciones; no las reemplaza ni registra asistencia directamente.
- **Letrapps** es la prueba de velocidad lectora de la escuela; sus resultados se registran por alumno.
- **Formatos recibidos:** Letrapps (PDF: PPM, velocidad y calidad) y DIA (`.xlsx`: % por eje u OA) están descritos en la sección 4.4 del documento. **Ninguna fuente externa trae RUT**: el alumno se identifica por curso y nombre normalizado, y los casos dudosos se resuelven en la vista previa (sección 6.2).
- La escuela trabaja por **semestres** (`periodo: "2026-S1"`), y la asistencia se mide por semestre.
- **SIMCE:** solo resultados agregados de escuela, en un módulo aparte (por definir). No alimenta alertas individuales. 4° rinde todos los años; 6° y 8° se alternan.
- **Alertas de asistencia**, con criterios de la escuela y umbrales configurables en `reglasAlerta`, nunca fijos en el código:
  - ≥ 90% → Esperado
  - 85% ≤ X < 90% → Inasistencia reiterada
  - 50% ≤ X < 85% → Grave
  - < 50% → Crítica
- **Alertas de rendimiento** por área (lenguaje/matemática) y general, además de evaluaciones externas, alertas cruzadas, discrepancias y tendencia. Ver sección 5 del documento.
- **Formatos de archivo pendientes:** las secciones marcadas "⏳ Pendiente de formato" no se implementan con supuestos. Pedir el formato real (anonimizado) primero.

### Roles

En orden jerárquico: `directora` (acceso total), `inspectorGeneral`, `jefeTecnico`, `coordinadoraConvivencia`, `evaluadora`, `orientador`, `duplaPsicosocial`, `coordinadoraPie`, `docente`.

- Los permisos se guardan en la base de datos (colección `roles`) y la Directora los edita. No se codifican por rol en el código.
- **Alcance por curso:** `roles.alcance` es `escuela` o `cursosAsignados`. Con `cursosAsignados` (hoy, `docente`) el usuario solo ve y carga datos de los cursos en `usuarios.cursoIds`. Esto se filtra en los servicios, no solo en el guard. Ver sección 7.4 del documento.
- El `docente` sube notas y asistencia, ve la ficha y las alertas, y registra observaciones (no psicosociales ni PIE), siempre solo de sus cursos.
- Cada endpoint exige su permiso con `@RequierePermisos('…')`.

**Implementación (backend):**

- El catálogo de permisos y los roles iniciales están en `backend/src/usuarios/permisos.ts` (la lista `PERMISOS` se repite en `frontend/src/api/types.ts`: mantenerlas iguales). Hoy existen `directora` (siempre con todos los permisos: los recupera al iniciar la API) y `docente`; faltan los otros 7 roles.
- Decoradores y tipos en `backend/src/comun/autorizacion.ts`: `@RequierePermisos(...)`, `@Publica()`, `@SoloAutenticado()`, `@UsuarioActual()`, `UsuarioAutorizado` y `SolicitudAutorizada`. No crear copias en otros módulos.
- El guard global (`usuarios/guards/permisos.guard.ts`) **deniega por defecto**: una ruta sin `@RequierePermisos`, `@Publica` ni `@SoloAutenticado` responde 403. Sin sesión, o con un usuario inactivo, responde 401.
- Filtro por curso en los servicios con `cursosPermitidos(usuario)` y `tieneAccesoACurso(usuario, cursoId)` (`usuarios/alcance.ts`).

### Autenticación

- Login con Google: el backend verifica el ID token.
- **Lista blanca:** solo pueden entrar los correos registrados en `usuarios`.
- Sesión con JWT en cookie httpOnly.

**Implementación (backend):**

- `POST /api/autenticacion/google` recibe `{ idToken }` (del botón de Google Identity Services) y deja la sesión en la cookie `intelitalia_sesion`. También existen `GET /api/autenticacion/perfil` y `POST /api/autenticacion/salir`.
- Variables: `GOOGLE_CLIENT_ID` y `JWT_SECRETO` (obligatorias), `DOMINIO_GOOGLE_PERMITIDO` (vacío = cualquier cuenta de Google; con dominio = solo ese Google Workspace) y `CORREO_DIRECTORA_INICIAL` (crea el primer usuario). Ver `.env.example`.
- **Frontend:** el botón de Google (`@react-oauth/google`) envía el `idToken` al backend. `SessionProvider` consulta `/perfil` al abrir la app (un 401 ahí es normal: significa que no hay sesión), y `RutaProtegida` redirige a `/ingresar` sin sesión. Necesita `VITE_GOOGLE_CLIENT_ID` en `frontend/.env` (Vite no lee el `.env` de la raíz), y el Client ID debe tener `http://localhost:5173` en sus orígenes autorizados.
- ⏳ En Docker, `VITE_GOOGLE_CLIENT_ID` todavía no se le pasa al build del servicio `web`.

### Auditoría

- Se registra emitiendo el evento `auditoria.acceso` con `EventEmitter2`; `AuditoriaListener` lo guarda en `registroAuditoria`. Solo identificadores (`usuarioId`, `alumnoId`, `recursoId`), nunca RUT, nombres ni notas.
- Hoy se registran el inicio de sesión, el cierre, el acceso denegado al login, cada carga (`carga.crear`), cada ficha vista (`ficha.ver`) y cada ficha fuera del alcance (`accesoDenegado`). ⏳ Faltan las exportaciones, los cambios de usuarios y permisos, y los 403 del guard.

### Implementación (frontend)

- **`src/api/`:** una función por endpoint, siempre con `pedir()` (`api/cliente.ts`), que agrega el prefijo `/api`, envía la cookie de sesión y convierte los errores en `ErrorApi` con el mensaje del backend.
- **`hooks/consultas.ts`:** las lecturas pasan por TanStack Query (`useCursos`, `useAlumnosDeCurso`, `useFicha`, `useCargas`). El cliente está en `api/consultas.ts`. Después de guardar algo, invalidar las consultas afectadas (p. ej. `['alumnos']` y `['cargas']` al confirmar una carga).
- **Rutas (`router/index.tsx`):** todo lo que no es `/ingresar` va dentro de `RutaProtegida` y de `LayoutPrincipal`. Una ruta que exige un permiso se envuelve en `<RutaProtegida permiso="…" />`, que redirige a `/` si falta. El menú (`Sidebar`) oculta las opciones sin permiso. Igual que en el backend, esto no reemplaza el control de la API.
- **Subir archivos:** con `FormData` y **sin** `Content-Type: application/json`. `pedir()` lo omite solo cuando el `body` es un `FormData`, para que el navegador ponga el `multipart` con su separador.

## Stack y estructura

Monorepo sin `package.json` raíz: cada carpeta se instala y ejecuta por separado.

| Carpeta | Tecnología |
|---------|------------|
| `backend/` | NestJS 11 + TypeScript, MongoDB (Mongoose), Redis + BullMQ para cargas de archivos y recálculo de alertas |
| `frontend/` | React 19 + Vite + TypeScript |
| `docs/` | Documentación del proyecto |

Despliegue: Docker Compose (`docker-compose.yml`; `docker-compose.dev.yml` para desarrollo). **El hosting está por definir** (servidor de la escuela, servidor nacional o PaaS externo; ver sección 8.5 del documento). No usar servicios propios de un proveedor: todo se configura por variables de entorno. MongoDB y Redis nunca quedan expuestos a internet.

### Estado actual (actualizar al mergear cada tarea)

| Área | Implementado en `master` | Pendiente |
|------|--------------------------|-----------|
| Base | Infraestructura y CI (PGT-42); entidades `cursos`, `asignaturas`, `alumnos` y `npm run semilla` (PGT-43); creación de cursos por año (`POST /api/cursos` y `/api/cursos/preparar-anio`) | — |
| Acceso | Roles y permisos (PGT-7), login con Google (PGT-6) y administración de usuarios: `/api/usuarios` (PGT-51) | Otros 7 roles; pantallas de administración |
| Lectura | `GET /api/cursos`, `GET /api/cursos/:id/alumnos` (PGT-56/57) y la ficha `GET /api/alumnos/:id` con auditoría (PGT-9) | Semáforo, alertas, notas y asistencia en la ficha |
| Cargas | Carga del DIA con vista previa y confirmación: `/api/cargas` (PGT-54); colecciones `tiposEvaluacion`, `resultadosEvaluacion` y `cargas` | BullMQ, alias de nombres, Letrapps; Mi Aula y SEPA, bloqueados por el formato |
| Alertas | — | Motor, `reglasAlerta`, `alertas`, `estadosAlumno` (sección 5) |
| Frontend | Login con Google y sesión real; layout con `Topbar` y `Sidebar` (menú según permisos) y TanStack Query. Rutas: `/` vista general (tabla de alumnos por curso con la API y dashboard con datos de ejemplo de `datos/ejemplo.ts`), `/alumnos/:id` ficha con los resultados del DIA y `/cargas` carga del DIA (permiso `cargas.evaluaciones`) | Dashboard con datos reales, administración y alertas |

### Pendientes acordados (implementar después)

Ajustes ya conversados con el equipo que todavía no están en el código. Al implementar uno, borrarlo de esta lista y actualizar `docs/ARQUITECTURA.md`.

1. **Resultados de evaluaciones por curso:** `GET /api/cursos/:id/evaluaciones?anio=` (con `alumnos.ver` y alcance), para la tabla del curso con los % del DIA de cada alumno. Hoy solo están en la ficha, alumno por alumno, y pedir 20 fichas dejaría 20 registros `ficha.ver` en la auditoría.
2. **Búsqueda de alumnos por RUT, IPE o nombre:** `POST /api/alumnos/busqueda` con `{ texto }`. Es `POST` para que el RUT no quede en la URL ni en los logs del proxy. Un docente solo encuentra alumnos de sus cursos, y una búsqueda fuera de su alcance devuelve una lista vacía (no un 403). `AlumnosService.buscarPorRut` y `buscarPorIpe` ya existen.
3. **Documentación de la API:** la sección 7.1 de `ARQUITECTURA.md` todavía exige el claim `hd` (ahora `DOMINIO_GOOGLE_PERMITIDO` es opcional) y no documenta qué devuelve `/perfil`. Los endpoints de `/api/usuarios` no están documentados. Conviene una sección "Referencia de la API" con todos los endpoints.
4. **Auditoría pendiente:** cambios de usuarios, roles y permisos, los 403 del guard, `GET /api/auditoria` (con `auditoria.ver`) y unificar los nombres de las acciones (`inicioSesion` y `accesoDenegado` conviven con `ficha.ver` y `carga.crear`).
5. **Aviso del popup de Google** ("Cross-Origin-Opener-Policy would block the window.postMessage call"): no rompe el login. Se silencia con el encabezado `Cross-Origin-Opener-Policy: same-origin-allow-popups` en Vite y Nginx.
6. **Año académico** (idea, sin decidir): colección `aniosAcademicos` con año vigente, fechas de los semestres y cierre, para no depender de la fecha del sistema y bloquear cargas en años cerrados. Los datos **no** se guardan dentro del año: ya están separados por `anio` y `periodo`.

### Tareas para la presentación (noviembre 2026)

Objetivo de la demo: iniciar sesión → ver los cursos → subir un DIA ficticio → resolver las filas dudosas → ver la ficha del alumno con su resultado. Todo con datos ficticios.

**Hecho (PR #20 a #23):** el recorrido completo funciona en el frontend y se probó de punta a punta con el DIA ficticio.

| # | Tarea | Dónde quedó |
|---|-------|-------------|
| 1 | Script `npm run dia-ficticio` | PR #20 |
| 2 | Pantalla principal con datos de la API | PR #22: la tabla de alumnos usa la API; el dashboard sigue con datos de ejemplo (ver pendientes) |
| 3 | Vista de curso | PR #22: quedó dentro de `/`, con un selector de curso (`?curso=`), no en `/cursos/:id` |
| 4 | Ficha `/alumnos/:id` | PR #22 y #23: datos, matrícula y resultados del DIA con los % por eje. ⏳ Falta la sección "Notas y asistencia: pendiente de Mi Aula" |
| 5 | Carga `/cargas` | PR #22 y #23: un archivo por curso, vista previa, resolución de filas dudosas, cargas parciales y tarjetas que muestran lo ya cargado. No hay una lista aparte con el historial |

**Pendiente:**

| # | Tarea | Quién | Depende de |
|---|-------|-------|------------|
| 6 | Endpoint de resultados por curso (pendiente 1) para mostrar los % del DIA en la tabla de alumnos | Backend | Opcional para la demo |
| 7 | Referencia de la API (pendiente 3), para que el frontend tenga un solo lugar donde mirar | Backend | — |
| 8 | Preparar el equipo de la demo (ver "Puesta en marcha en un equipo nuevo") y ensayar el guion | Equipo | — |
| 9 | Dashboard (`/?vista=dashboard`): hoy muestra datos de ejemplo de `frontend/src/datos/ejemplo.ts`, con la etiqueta "Datos de ejemplo". En la demo, presentarlo como diseño, o pasarlo a datos reales cuando existan las alertas | Frontend | Alertas (sección 5) |

**Fuera de la demo:** alertas y semáforo (sin notas, asistencia ni cortes del DIA no hay datos para calcularlas), Letrapps, Mi Aula, SEPA, administración de usuarios en el frontend y los pendientes 2, 4 y 6.


## Comandos

```bash
# Configuración (una vez): copiar y completar las claves. .env nunca se sube.
cp .env.example .env

# Desarrollo: MongoDB y Redis en Docker (solo en 127.0.0.1); API y Vite en local
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo redis

# Todo en Docker (como en el servidor): http://localhost:8080
docker compose up -d --build

# Backend
cd backend
npm install
npm run start:dev     # servidor en modo watch (http://localhost:3000/api/salud)
npm run lint          # ESLint (con --fix)
npm run lint:check    # ESLint sin corregir (el que corre el CI)
npm run format        # Prettier
npm test              # tests unitarios (Jest)
npm run test:e2e      # tests e2e (MongoDB en memoria; o MONGO_URI_E2E=… para usar uno existente)
npm run build
npm run semilla       # carga datos FICTICIOS (asignaturas, cursos PK–8° y alumnos) en el MONGO_URI de .env; nunca en producción
npm run dia-ficticio -- 3 lenguaje 2026   # genera un DIA FICTICIO (.xlsx) con los alumnos de la semilla en backend/archivos-ficticios/ (no se sube)

# Frontend
cd frontend
npm install
npm run dev           # servidor de desarrollo Vite
npm run lint
npm run build         # tsc -b && vite build
```

Antes de dar un cambio por terminado, correr `lint`, `build` y los tests de la carpeta modificada. El CI (`.github/workflows/ci.yml`) corre lo mismo en cada pull request.

**Puesta en marcha en un equipo nuevo (desarrollo):**

1. `cp .env.example .env` en la raíz y completar **todas** las secciones. `JWT_SECRETO` con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, y `CORREO_DIRECTORA_INICIAL` con el correo de quien va a entrar.
2. `frontend/.env` con `VITE_GOOGLE_CLIENT_ID=<el mismo Client ID>`. En Google Cloud, el Client ID tiene que tener `http://localhost:5173` en "Orígenes autorizados de JavaScript".
3. Abrir Docker Desktop y levantar Mongo y Redis (comando de arriba). Si falla con "ports are not available … 27017", hay un **MongoDB instalado en Windows** ocupando el puerto: detenerlo con `Stop-Service MongoDB` (PowerShell como administrador).
4. `npm ci` en `backend/` y en `frontend/`.
5. `npm run semilla -- 2026` y después `npm run dia-ficticio -- 3 lenguaje 2026`. **El año tiene que ser el mismo**, porque el DIA trae el año en la fecha de descarga.
6. `npm run start:dev` (backend) y `npm run dev` (frontend). Entrar a `http://localhost:5173` con el correo de `CORREO_DIRECTORA_INICIAL`.
7. Si `crear-usuario-app.js` no creó el usuario de Mongo (por ejemplo, porque se cambió `MONGO_CLAVE_APP` después de crear el volumen), recrear el volumen con `docker compose down -v`, lo que borra los datos locales, y volver a correr la semilla.

**Notas para no romper el CI:**

- **Dependencias:** instalar con `npm install` (nunca editar `package.json` a mano) y commitear `package.json` y `package-lock.json` juntos, porque el CI usa `npm ci`. Usar versiones compatibles con **NestJS 11**: las últimas de algunos paquetes `@nestjs/*` (p. ej. `@nestjs/jwt` o `@nestjs/event-emitter`) son para NestJS 12 y rompen los tests de Jest.
- **Variables nuevas:** agregarlas en `configuracion/validacion.ts`, `.env.example`, `docker-compose.yml` (servicio `api`) y `test/entorno-global.ts`. Si falta en el último, fallan todos los e2e.
- **Tests e2e con sesión:** simular la sesión con un middleware que solo existe en el test y llena `request.sesion` (ver `test/cursos.e2e-spec.ts`). Nunca agregar un "login falso" a la API.
- **VS Code:** usar el TypeScript del backend (`.vscode/settings.json`). El que trae VS Code (6.x) activa `strict` y marca errores que el build no tiene.

## Convenciones de código

- **Nombres en español** para módulos, colecciones, campos, rutas de la API y permisos. Se escriben en camelCase y sin tildes ni ñ: `anio`, `nivelLogro`, `fechaNacimiento`, `/api/alumnos`, `alumnos.ver`.
- Las palabras propias del framework se mantienen en inglés en los nombres de clases y archivos: `AlumnosModule`, `AlumnosController`, `AlumnosService`, `AlumnoSchema`, `CrearAlumnoDto`, `alumnos.service.ts`.
- Colecciones en plural (`alumnos`, `cursos`) y campos en singular, salvo los arreglos (`matriculas`).
- **Cursos:** todo referencia `cursoId`, nunca el nivel directamente. `letra` es opcional (`null` hoy) para soportar a futuro cursos como 4° A y 4° B sin cambiar el esquema.
- **Asignaturas:** usar el campo `area` (`lenguaje` | `matematica` | `otra`) para toda lógica por área, nunca el nombre de la asignatura.
- **RUT:** normalizado (`12345678-5`, sin puntos, DV en mayúscula) y validado con módulo 11. Se admite `ipe` para alumnos sin RUT.
- **Backend:** Prettier con comillas simples y trailing commas (`backend/.prettierrc`), además de ESLint con `typescript-eslint`.

## Privacidad (Ley 21.719)

El sistema trata datos de menores, y algunos son **sensibles** (datos PIE y observaciones psicosociales). Al implementar:

- **Minimización:** importar solo las columnas necesarias y borrar el archivo original después de procesarlo.
- Datos PIE y psicosociales accesibles (para verlos y para crearlos) solo con los permisos `pie.ver` y `observaciones.verPsicosocial`.
- Las reglas de la sección 8.4 del documento se implementan siempre, sea cual sea el hosting.
- Registrar en `registroAuditoria` los accesos a fichas, las cargas, las exportaciones y los cambios de permisos.
- No registrar en logs datos personales (RUT, nombres, notas) más allá de lo necesario.
- Ver sección 8 de `docs/ARQUITECTURA.md`.
