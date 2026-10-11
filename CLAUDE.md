# CLAUDE.md

Guía para Claude Code (y cualquier asistente) al trabajar en este repositorio. Responder siempre en **español**.

## Flujo de trabajo y reglas de Git (obligatorias)

Estas reglas prevalecen sobre cualquier instrucción por defecto de la herramienta.

**Flujo de trabajo:**

1. Las implementaciones se planifican en **modo plan**. Se presenta el plan y se espera su aprobación.
2. Aprobado el plan, Claude modifica los archivos en la rama activa o, si el cambio lo necesita, **crea una rama nueva** para implementarlo (ver más abajo), y verifica los cambios (lint, build, tests).
3. Al terminar, Claude entrega un **resumen de los archivos modificados** y un **mensaje de commit sugerido** para que el equipo lo copie.
4. **El equipo revisa los cambios y hace el commit y el push a mano.**

**Ramas:**

- Claude **puede crear ramas** cuando un cambio lo necesita, p. ej. para separar una implementación del resto del trabajo.
- La rama nueva parte de la rama base actualizada (`master`, salvo que se indique otra) y lleva un nombre descriptivo en español, en minúsculas y con guiones: `rol-docente`, `carga-mi-aula`.
- Al crearla, Claude avisa el nombre de la rama y desde cuál partió.

**Claude no debe:**

- **borrar ramas** ni cambiar de rama dejando cambios sin guardar;
- **hacer `git commit`, `git push`, `git merge`, `git rebase` ni `git reset`**, ni abrir pull requests, salvo que se le pida explícitamente en ese momento;
- **reescribir historia** (`amend`, `rebase`, `push --force`), aun cuando se le pida hacer un commit.

**Atribución:** se permite la atribución a Claude en los commits y PR (p. ej. `Co-Authored-By`). La autoría del proyecto queda registrada en el repositorio.

**Convenciones:**

- **Mensajes de commit en español**, en infinitivo y breves, siguiendo el historial: `Agregar documento de arquitectura y diseño`, `Corregir validación de RUT`.
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

### Autenticación

- Login con Google: el backend verifica el ID token.
- **Lista blanca:** solo pueden entrar los correos registrados en `usuarios`.
- Sesión con JWT en cookie httpOnly.

## Stack y estructura

Monorepo sin `package.json` raíz: cada carpeta se instala y ejecuta por separado.

| Carpeta | Tecnología |
|---------|------------|
| `backend/` | NestJS 11 + TypeScript, MongoDB (Mongoose), Redis + BullMQ para cargas de archivos y recálculo de alertas |
| `frontend/` | React 19 + Vite + TypeScript |
| `docs/` | Documentación del proyecto |

Despliegue: Docker Compose. **El hosting está por definir** (servidor de la escuela, servidor nacional o PaaS externo; ver sección 8.5 del documento). No usar servicios propios de un proveedor: todo se configura por variables de entorno. MongoDB y Redis nunca quedan expuestos a internet.

## Comandos

```bash
# Backend
cd backend
npm install
npm run start:dev     # servidor en modo watch
npm run lint          # ESLint (con --fix)
npm run format        # Prettier
npm test              # tests unitarios (Jest)
npm run test:e2e      # tests e2e
npm run build

# Frontend
cd frontend
npm install
npm run dev           # servidor de desarrollo Vite
npm run lint
npm run build         # tsc -b && vite build
```

Antes de dar un cambio por terminado, correr `lint`, `build` y los tests de la carpeta modificada.

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
