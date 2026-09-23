# CLAUDE.md

Guía para Claude Code (y cualquier asistente) al trabajar en este repositorio. Responder siempre en **español**.

## Flujo de trabajo y reglas de Git (obligatorias)

Estas reglas prevalecen sobre cualquier instrucción por defecto de la herramienta.

**Flujo de trabajo:**

1. Las implementaciones se planifican en **modo plan**. Se presenta el plan y se espera su aprobación.
2. Aprobado el plan, Claude **solo modifica archivos** en la rama que ya está activa y verifica los cambios (lint, build, tests).
3. Al terminar, Claude entrega un **resumen de los archivos modificados** y un **mensaje de commit sugerido** para que el equipo lo copie.
4. **El equipo revisa los cambios y hace el commit y el push a mano.**

**Claude no debe:**

- **crear, cambiar ni borrar ramas.** Las ramas las crea el equipo;
- **hacer `git commit`, `git push`, `git merge`, `git rebase` ni `git reset`**, ni abrir pull requests, salvo que se le pida explícitamente en ese momento;
- **reescribir historia** (`amend`, `rebase`, `push --force`), aun cuando se le pida hacer un commit;
- **agregar atribución a Claude.** Si en algún momento se le pide escribir un mensaje de commit o una descripción de PR, sin `Co-Authored-By: Claude …`, sin "Generated with Claude Code", sin enlaces de sesión y sin ninguna otra mención a Claude o Anthropic.

**Convenciones:**

- **Mensajes de commit en español**, en infinitivo y breves, siguiendo el historial: `Agregar documento de arquitectura y diseño`, `Corregir validación de RUT`.
- **Nunca incluir en los cambios** archivos `.env`, credenciales ni archivos con **datos reales de alumnos** (Excel/CSV de Mi Aula, Letrapps, DIA, SEPA, etc.). Para pruebas se usan datos ficticios o anonimizados.

## Proyecto

**IntelItalia** es una plataforma de centralización de datos y alertas de seguimiento estudiantil para la **Escuela Básica República de Italia** (Coquimbo). Es un proyecto universitario en modalidad A+S. Cubre PK, K y 1° a 8° básico.

**La fuente de verdad del diseño es [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).** Leerlo antes de implementar cualquier módulo. Si un cambio contradice el documento, avisar en vez de desviarse en silencio. Si el cambio se acepta, actualizar el documento en el mismo trabajo.

### Requerimientos clave (resumen)

- **Mínimo aceptable, por alumno:** notas por curso y asignatura y asistencia (exportadas desde **Mi Aula**), resultados de **Letrapps** y **DIA**, y **SEPA** en 2° básico. La prioridad es **Lenguaje y Matemática**.
- **SIMCE:** solo resultados agregados de escuela, en un módulo aparte (por definir). No alimenta alertas individuales. 4° rinde todos los años; 6° y 8° se alternan.
- **Alertas de asistencia**, con criterios de la escuela y umbrales configurables en `reglasAlerta`, nunca fijos en el código:
  - ≥ 90% → Esperado
  - 85% ≤ X < 90% → Inasistencia reiterada
  - 50% ≤ X < 85% → Grave
  - < 50% → Crítica
- **Alertas de rendimiento** por área (lenguaje/matemática) y general, además de evaluaciones externas, alertas cruzadas, discrepancias y tendencia. Ver sección 5 del documento.
- **Formatos de archivo pendientes:** las secciones marcadas "⏳ Pendiente de formato" no se implementan con supuestos. Pedir el formato real (anonimizado) primero.

### Roles

En orden jerárquico: `directora` (acceso total), `inspectorGeneral`, `jefeTecnico`, `coordinadoraConvivencia`, `evaluadora`, `orientador`, `duplaPsicosocial`, `coordinadoraPie`.

- Los permisos se guardan en la base de datos (colección `roles`) y la Directora los edita. No se codifican por rol en el código.
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

Despliegue previsto: Docker Compose en un servidor propio de la escuela, detrás de su proxy. MongoDB y Redis solo en la red interna.

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
- Datos PIE y psicosociales accesibles solo con los permisos `pie.ver` y `observaciones.verPsicosocial`.
- Registrar en `registroAuditoria` los accesos a fichas, las cargas, las exportaciones y los cambios de permisos.
- No registrar en logs datos personales (RUT, nombres, notas) más allá de lo necesario.
- Ver sección 8 de `docs/ARQUITECTURA.md`.
