# IntelItalia — Documento de Arquitectura y Diseño

> **Estado:** borrador para revisión del equipo y del profesor guía.
> **Proyecto:** Proyecto Integrador Gestión TI (modalidad A+S) — Escuela Básica República de Italia, Coquimbo.
> **Socia comunitaria:** Jenny Salinas Rosales (Directora).
>
> Todo lo marcado con **⏳ Pendiente de formato** depende de los archivos reales que exporta cada fuente (Mi Aula, Letrapps, DIA, SEPA) y se ajustará cuando se revisen.

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Arquitectura general](#2-arquitectura-general)
3. [Modelo de datos (MongoDB)](#3-modelo-de-datos-mongodb)
4. [Evaluaciones externas](#4-evaluaciones-externas)
5. [Motor de alertas](#5-motor-de-alertas)
6. [Carga de datos](#6-carga-de-datos)
7. [Autenticación, roles y permisos](#7-autenticación-roles-y-permisos)
8. [Privacidad y protección de datos (Ley 21.719)](#8-privacidad-y-protección-de-datos-ley-21719)
9. [Frontend (vistas)](#9-frontend-vistas)
10. [Preguntas abiertas y próximos pasos](#10-preguntas-abiertas-y-próximos-pasos)

---

## 1. Contexto y objetivos

### Problema

La escuela lleva la asistencia, las calificaciones y los resultados de evaluaciones externas en fuentes separadas, y los datos no coinciden entre sí. Así cuesta ver a tiempo, por ejemplo, que un alumno con bajo rendimiento en Lenguaje también tiene baja asistencia, y cuesta tomar decisiones de apoyo oportunas.

### Objetivo

Centralizar los datos de cada alumno en una **ficha única**. A partir de esa información, un **sistema de alertas** clasifica la situación del alumno:

- rendimiento aceptable,
- baja asistencia,
- rendimiento deficiente en general, o **solo en Lenguaje** o **solo en Matemática**.

### Usuarios

Personal directivo, profesionales y docentes de la escuela, organizados en nueve roles (ver [sección 7](#7-autenticación-roles-y-permisos)). Los docentes acceden solo a los cursos que tienen asignados. No hay acceso para apoderados ni alumnos en esta etapa.

### Relación con Mi Aula

**Mi Aula sigue siendo el sistema donde se registran la asistencia y las notas.** IntelItalia no lo reemplaza ni duplica ese registro: importa las exportaciones de Mi Aula para completar la ficha del alumno y cruzarlas con las demás fuentes (Letrapps, DIA, SEPA). Registrar la asistencia directamente en la plataforma queda como posible mejora futura (ver [sección 10.2](#102-hoja-de-ruta-propuesta)).

### Alcance del MVP (mínimo aceptable)

Lo que la plataforma **debe centralizar y usar para emitir alertas**, siempre **por alumno**:

| # | Fuente | Datos | Uso en alertas |
|---|--------|-------|----------------|
| 1 | **Mi Aula** (exportación) | **Notas por curso y asignatura** y **asistencia** | Base de las alertas de rendimiento y de inasistencia |
| 2 | **Letrapps** | Resultados de la prueba de velocidad lectora | Alertas de Lenguaje |
| 3 | **DIA** (Agencia de Calidad) | Resultados de Lectura y Matemática | Alertas de Lenguaje y Matemática |
| 4 | **SEPA** | Resultados de 2° básico | Alertas de Lenguaje y Matemática |

La **prioridad** son las áreas de **Lenguaje y Matemática**.

**Fuera del mínimo, pero contemplado en el diseño:**

- **SIMCE:** solo entrega resultados agregados de la escuela, no por alumno. Irá en un módulo aparte, cuyo contenido está por definir. No se usa para las alertas individuales.
- **Evaluaciones propias** de la escuela: el catálogo de tipos de evaluación permite agregarlas sin cambiar código.


---

## 2. Arquitectura general

```text
                        ┌──────────────────────────────────────────────┐
                        │        Servidor propio de la escuela         │
                        │                                              │
 Navegador   HTTPS      │  ┌───────────┐     ┌──────────────────────┐  │
 (personal ─────────────┼─▶│  Proxy /  │────▶│  Frontend (React +   │  │
  escuela)              │  │  Nginx    │     │  Vite, estáticos)    │  │
                        │  └─────┬─────┘     └──────────────────────┘  │
                        │        │ /api                                │
                        │        ▼                                     │
                        │  ┌──────────────────────┐                    │
                        │  │  API NestJS          │   jobs   ┌───────┐ │
                        │  │  (REST + workers     │◀────────▶│ Redis │ │
                        │  │   BullMQ)            │  BullMQ  └───────┘ │
                        │  └──────────┬───────────┘                    │
                        │             │                                │
                        │             ▼                                │
                        │       ┌───────────┐                          │
                        │       │  MongoDB  │   (solo red interna)     │
                        │       └───────────┘                          │
                        └──────────────────────────────────────────────┘
                                      ▲
                                      │ verificación del ID token
                                ┌─────┴──────┐
                                │  Google    │
                                └────────────┘
```

### Tecnologías

| Capa | Tecnología | Uso |
|------|------------|-----|
| Frontend | React 19 + Vite, React Router, TanStack Query, librería de gráficos (p. ej. Recharts) | SPA para el personal de la escuela |
| Backend | NestJS 11 (TypeScript), `@nestjs/mongoose`, `@nestjs/config`, `@nestjs/jwt`, `google-auth-library` | API REST, reglas de negocio, autenticación |
| Base de datos | **MongoDB** | Fuente de verdad. El modelo documental absorbe los formatos heterogéneos de las evaluaciones externas y los conceptos de PK/K |
| Colas | **Redis** + **BullMQ** (`@nestjs/bullmq`) | Procesa en segundo plano las cargas de archivos y el recálculo de alertas. Redis **no** guarda datos que sean fuente de verdad |
| Lectura de archivos | `exceljs` (XLSX) y `csv-parse` (CSV) | Parsers de cada fuente |

> **¿Por qué MongoDB?** Que cada curso tenga asignaturas distintas se resuelve con cualquier base de datos. El argumento de fondo es el requisito de **adaptarse a distintos formatos de prueba**: Letrapps, DIA, SEPA y las evaluaciones propias entregan métricas diferentes, y pre-kínder y kínder se evalúan con conceptos en vez de notas. Cada resultado se guarda con su forma original y además con un **nivel normalizado** común (ver [sección 4](#4-evaluaciones-externas)).

### Módulos del backend (NestJS)

| Módulo | Responsabilidad |
|--------|-----------------|
| `autenticacion` | Login con Google, emisión y validación de la sesión (JWT) |
| `usuarios` | Lista blanca de usuarios, asignación de roles, gestión de roles y permisos |
| `alumnos` | Ficha del alumno, matrículas por año |
| `cursos` | Cursos por año (nivel + letra opcional) |
| `asignaturas` | Catálogo de asignaturas con su área (lenguaje, matemática u otra) |
| `cargas` | Subida de archivos, cola de procesamiento, informe de errores |
| `calificaciones` | Notas y conceptos |
| `asistencia` | Registros y porcentajes de asistencia |
| `evaluaciones` | Tipos de evaluación externa y sus resultados |
| `simce` | Resultados agregados de la escuela (módulo por definir) |
| `alertas` | Reglas, motor de cálculo y estado de cada alumno |
| `observaciones` | Anotaciones del personal sobre cada alumno |
| `auditoria` | Registro de accesos y acciones sobre datos personales |

### Despliegue

- **Docker Compose** con cuatro servicios: `api` (NestJS, incluye los workers), `web` (frontend compilado servido por Nginx), `mongo` y `redis`.
- ⏳ **El hosting está por definir.** Hay tres escenarios posibles: el **servidor propio de la escuela**, un **servidor nacional** (datacenter en Chile) o un **PaaS externo**. Sus implicancias legales están en la [sección 8.5](#85-escenarios-de-hosting).
- El diagrama muestra el escenario del servidor de la escuela, detrás de su proxy. HTTPS termina en el proxy o en el Nginx interno.
- **Solo el proxy queda expuesto a la red.** MongoDB y Redis quedan en la red interna de Docker, con autenticación activada y sin puertos publicados.
- **Portabilidad:** el mismo `docker-compose.yml` y la misma configuración sirven para los tres escenarios. Los servicios externos se conectan por variables de entorno (`MONGO_URI`, `REDIS_URL`, etc.), así que se puede usar una base de datos administrada sin cambiar el código. No se usan servicios propios de un proveedor.
- La configuración va en variables de entorno (`.env`, nunca en el repositorio), validadas al iniciar con `@nestjs/config`. Si falta una variable obligatoria, la API no arranca.

**Implementación (PGT-42):**

| Archivo | Uso |
|---------|-----|
| `docker-compose.yml` | Despliegue completo. Solo `web` publica un puerto (`PUERTO_WEB`, por defecto 8080). Nginx sirve el frontend y reenvía `/api` a `api:3000` |
| `docker-compose.dev.yml` | Override de desarrollo: publica MongoDB y Redis **solo en `127.0.0.1`** para correr la API y Vite en local. No se usa en el servidor |
| `docker/mongo/crear-usuario-app.js` | Al crear la base, crea un usuario con `readWrite` solo sobre `intelitalia`. La API usa ese usuario, no el root (mínimo privilegio) |
| `.env.example` | Plantilla de variables. Se copia a `.env`, que nunca se sube |
| `.github/workflows/ci.yml` | En cada pull request: lint, build y tests del backend (unitarios y e2e con MongoDB en memoria) y lint y build del frontend |

- **Variables de la API:** `NODE_ENV`, `PUERTO`, `MONGO_URI`, `REDIS_URL` y `ORIGEN_FRONTEND` (origen permitido por CORS, con credenciales para la cookie de sesión). Están validadas en `backend/src/configuracion/validacion.ts`.
- **Salud:** `GET /api/salud` responde `{ estado, mongo, redis }`: 200 si todo está arriba y 503 si algo falla. Lo usan los healthchecks de Docker y del proxy. No expone datos personales ni detalles internos.
- Todas las rutas de la API llevan el prefijo `/api`.

### Convención de nombres

- **Módulos, colecciones, campos, rutas de la API y permisos en español.**
- **camelCase, sin tildes ni ñ**: `anio`, `nivelLogro`, `fechaNacimiento`, `apellidoPaterno`. Así se evitan problemas de codificación en consultas, índices y URLs.
- Colecciones en plural (`alumnos`, `cursos`), campos en singular salvo los arreglos (`matriculas[]`).
- Las palabras propias del framework se mantienen en inglés en los nombres de clases y archivos: `AlumnosModule`, `AlumnosController`, `AlumnosService`, `AlumnoSchema`, `CrearAlumnoDto`, `alumnos.service.ts`.
- Rutas de la API: `/api/alumnos`, `/api/cursos/:id/alumnos`, `/api/cargas/:id`.

---

## 3. Modelo de datos (MongoDB)

Los identificadores entre colecciones (`alumnoId`, `cursoId`, etc.) son `ObjectId`. Todas las colecciones llevan `creadoEn` y `actualizadoEn` (timestamps de Mongoose). Los nombres de los campos son una propuesta inicial.

### 3.1 `alumnos`

```js
{
  _id: ObjectId,
  rut: "12345678-5",          // normalizado: sin puntos, con guion, DV en mayúscula
  ipe: null,                  // Identificador Provisorio Escolar (alumnos extranjeros sin RUT)
  nombres: "Ana María",
  apellidoPaterno: "Pérez",
  apellidoMaterno: "Soto",       // opcional (null si tiene un solo apellido)
  nombreNormalizado: "ANA MARIA PEREZ SOTO",  // calculado: sin tildes, mayúsculas, palabras ordenadas
  fechaNacimiento: ISODate,      // ⏳ solo si Mi Aula la exporta y se usa
  matriculas: [
    { anio: 2026, cursoId: ObjectId, estado: "activa" }   // activa | retirada | trasladada
  ],
  pie: {                       // ⚠️ dato sensible: solo roles autorizados (ver sección 7)
    participa: true,
    tipoNee: "transitoria"     // transitoria | permanente
  }
}
```

- **Índices:** `rut` único (parcial, cuando no es `null`), `ipe` único (parcial), `matriculas.anio + matriculas.cursoId`, `nombreNormalizado`.
- El RUT se valida con el dígito verificador (módulo 11) antes de guardarse.
- **Implementación (PGT-43):**
  - todo alumno necesita RUT o IPE, y no puede tener dos matrículas **activas** el mismo año (una retirada y otra activa sí, para cambios de curso);
  - `nombreNormalizado` no depende del orden de nombres y apellidos: "Pérez Soto Ana María" y "Ana María Pérez Soto" dan la misma clave. Sirve para identificar al alumno en fuentes sin RUT;
  - `pie` tiene `select: false`: **no aparece en ninguna consulta** salvo que se pida explícitamente (`AlumnosService.obtenerDatosPie`), que solo se usará detrás del permiso `pie.ver`;
  - todavía no hay endpoints HTTP: llegan con el login y los permisos (PGT-6, PGT-7), para no exponer datos de alumnos sin control de acceso.
- **Minimización:** solo se guardan los campos que se usan. No se importan dirección, teléfono, datos del apoderado ni diagnósticos detallados, aunque vengan en el archivo.

### 3.2 `cursos`

```js
{
  _id: ObjectId,
  anio: 2026,
  nivel: "4",                 // "PK" | "K" | "1" … "8"
  letra: null,                // opcional; hoy la escuela no usa letras
  nombre: "4° Básico",        // calculado; con letra sería "4° Básico A"
  asignaturaIds: [ObjectId]
}
```

**Escalabilidad ante cursos con letra (4° A, 4° B):**

- Hoy la escuela tiene **un solo curso por nivel**. Aun así, el curso se modela desde el principio como su propia entidad (`anio` + `nivel` + `letra`) y **no** como un simple "nivel". Si en el futuro existen 4° A y 4° B, solo se crean dos documentos en `cursos`; ni el esquema ni el código cambian.
- **Índice único compuesto** `{ anio, nivel, letra }`, con `letra: null` como valor válido.
- Todo lo que depende del curso (`matriculas`, `calificaciones`, `asistencias`, filtros y dashboards) referencia siempre **`cursoId`**, nunca el nivel directamente. Los reportes "por nivel" se obtienen agrupando los cursos de ese nivel.
- En el frontend, el selector muestra el `nombre` del curso. Mientras no haya letras se ve igual que hoy ("4° Básico").
- **Resolución del curso al cargar archivos** (por año + nivel + letra):
  - Si el nivel tiene **un solo curso**, la fila se asigna a ese curso, **traiga o no letra el archivo**. Esto importa porque los instrumentos externos escriben una letra aunque la escuela no la use: Letrapps pone "3° Básico A" y el DIA, "3 A".
  - Si el nivel tiene **más de un curso**, la letra del archivo tiene que coincidir con la de un curso. Si el archivo no trae letra o la letra no existe, la fila se marca como **error que hay que resolver**.
  - Cada parser traduce el formato de curso de su fuente ("3° Básico A", "3 A", "3°B") a nivel + letra.
- **Cuando la escuela empiece a usar letras:** se crean los cursos del año nuevo con su letra (p. ej. 3° A y 3° B). Los cursos de años anteriores, con `letra: null`, no cambian, así que el historial se mantiene.

### 3.3 `asignaturas`

```js
{
  _id: ObjectId,
  codigo: "LEN",
  nombre: "Lenguaje y Comunicación",
  area: "lenguaje",           // "lenguaje" | "matematica" | "otra"
  aliases: ["Lenguaje", "Lenguaje y Comunicación", "Lengua y Literatura"]
}
```

- El campo **`area`** permite que las alertas "solo Lenguaje" o "solo Matemática" funcionen aunque cada curso o archivo nombre la asignatura de otra forma.
- Los **`aliases`** permiten reconocer la asignatura al cargar archivos con nombres distintos.
- **Implementación (PGT-43):** el campo calculado `nombresNormalizados` (nombre y aliases sin tildes ni mayúsculas) permite buscar por cualquiera de ellos. Un alias puede repetirse entre niveles ("Lenguaje" en PK/K y en básica), así que al cargar se busca **dentro de las asignaturas del curso** (`curso.asignaturaIds`). El catálogo inicial está en `backend/src/asignaturas/catalogo.ts` (⏳ confirmar con la malla de la escuela y los nombres de Mi Aula, sobre todo PK y K).

### 3.4 `calificaciones`

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  cursoId: ObjectId,
  asignaturaId: ObjectId,
  periodo: "2026-S1",         // semestre: "2026-S1" | "2026-S2" (la escuela trabaja por semestres)
  numeroEvaluacion: 3,        // ⏳ pendiente de formato (¿Mi Aula exporta notas parciales o solo promedios?)
  tipo: "parcial",            // "parcial" | "promedioPeriodo" | "promedioFinal"
  nota: 5.4,                  // 1.0–7.0 (1° a 8° básico)
  concepto: null,             // PK/K: "L" (logrado) | "ML" (medianamente logrado) | "PL" (por lograr) ⏳
  fecha: ISODate,
  cargaId: ObjectId           // qué carga originó el dato (trazabilidad)
}
```

- **Índice único:** `{ alumnoId, asignaturaId, periodo, tipo, numeroEvaluacion }`. Hace que volver a cargar el mismo archivo actualice los datos en vez de duplicarlos.

### 3.5 `asistencias`

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  cursoId: ObjectId,
  periodo: "2026-03",         // ⏳ mes, semestre o fecha diaria según el formato de Mi Aula
  diasTrabajados: 20,
  diasPresente: 17,
  porcentaje: 85.0,           // calculado = diasPresente / diasTrabajados * 100
  cargaId: ObjectId
}
```

- ⏳ La granularidad (diaria, mensual o semestral) depende de la exportación de Mi Aula. Si viene por día o por mes, se guarda así y el porcentaje se calcula en una agregación.
- La escuela mide la asistencia **por semestre**: la alerta usa el porcentaje del semestre en curso (sección 5.2 a).

### 3.6 `tiposEvaluacion`

Catálogo que describe **cómo se lee y cómo se normaliza** cada instrumento. Agregar una evaluación nueva, como una prueba propia de la escuela, es crear un documento aquí, no programar.

Ejemplos con los campos reales de cada instrumento (ver [sección 4.4](#44-formatos-recibidos)):

```js
// Letrapps: categorías ordenadas, comparadas con el estándar Mineduc del nivel
{
  _id: ObjectId,
  codigo: "LETRAPPS",
  nombre: "Letrapps — Dominio lector",
  areas: ["lenguaje"],
  niveles: ["1", "2", "3", "4", "5", "6", "7", "8"],   // ⏳ a confirmar
  momentos: ["medicion1", "medicion2", "medicion3"],   // ⏳ cuántas mediciones hay al año
  campos: [
    { clave: "ppm", tipo: "numero", min: 0 },           // palabras por minuto
    { clave: "velocidad", tipo: "categoria",
      orden: ["noLector", "muyLenta", "lenta", "medioBaja", "medioAlta", "rapida", "muyRapida"] },
    { clave: "calidad", tipo: "categoria",
      orden: ["noLector", "silabica", "palabraAPalabra", "unidadesCortas", "fluida"] },
    { clave: "textoLeido", tipo: "texto" }              // p. ej. "Cómo plantar un árbol"
  ],
  reglaNormalizacion: {
    tipo: "estandarNivel",                              // distancia a la categoría estándar del nivel
    campos: ["velocidad", "calidad"],
    estandarPorNivel: { "3": { velocidad: "medioAlta", calidad: "unidadesCortas" } },  // ⏳ resto de niveles
    // ⏳ por definir con la escuela; propuesta: en el estándar o sobre él → adecuado,
    //    una categoría bajo él → medio, dos o más → bajo
  },
  activo: true
}

// DIA: solo porcentajes por eje (Lectura) o por OA (Matemática), sin nivel de logro
{
  _id: ObjectId,
  codigo: "DIA",
  nombre: "Diagnóstico Integral de Aprendizajes",
  areas: ["lenguaje", "matematica"],
  niveles: ["2", "3", "4", "5", "6", "7", "8"],        // ⏳ a confirmar
  momentos: ["diagnostico", "monitoreo", "cierre"],
  campos: [
    // lenguaje: { localizar, interpretarRelacionar, reflexionar }; matematica: { OA2, OA3, … }
    { clave: "porcentajesPorEje", tipo: "mapaNumeros", min: 0, max: 100 },
    { clave: "porcentajeLogro", tipo: "numero", min: 0, max: 100, calculado: "promedio de porcentajesPorEje" }
  ],
  reglaNormalizacion: {
    tipo: "rangos",
    campo: "porcentajeLogro",
    rangos: [ /* ⏳ cortes a definir por la escuela (Jefa Técnica) */ ]
  },
  activo: true
}
```

- **Tipos de normalización:** `mapa` (categoría → nivel), `rangos` (número → nivel) y `estandarNivel` (posición respecto de la categoría esperada para el nivel del alumno). Cada instrumento usa **su propio criterio**; el catálogo solo dice cómo traducirlo a la escala común.

### 3.7 `resultadosEvaluacion`

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  tipoEvaluacionId: ObjectId,
  cursoId: ObjectId,
  anio: 2026,
  momento: "diagnostico",     // DIA: diagnostico | monitoreo | cierre; Letrapps: medicion1, medicion2…
  area: "lenguaje",
  resultados: { porcentajesPorEje: { localizar: 55, interpretarRelacionar: 70, reflexionar: 20 }, porcentajeLogro: 48.3 },
                                                          // forma libre, según tiposEvaluacion.campos
  nivelNormalizado: "bajo",                               // "bajo" | "medio" | "adecuado"
  fechaAplicacion: ISODate,
  cargaId: ObjectId
}
```

- **Índice único:** `{ alumnoId, tipoEvaluacionId, anio, momento, area }`.

### 3.8 `resultadosSimce`

Resultados **agregados de la escuela**, sin datos por alumno.

```js
{
  _id: ObjectId,
  anio: 2026,
  nivel: "4",
  asignatura: "lectura",      // "lectura" | "matematica" | …
  puntajePromedio: 262,
  distribucionNiveles: { insuficiente: 30.5, elemental: 40.1, adecuado: 29.4 },  // % de alumnos
  comparacionMismoGse: "similar"  // ⏳ según lo que se quiera mostrar
}
```

### 3.9 Colecciones de alertas

**`reglasAlerta`**: umbrales configurables. Se pueden editar desde la plataforma sin tocar código.

```js
{
  _id: ObjectId,
  codigo: "asistencia",
  descripcion: "Categorías de asistencia de la escuela",
  activa: true,
  parametros: {
    // "desde" es inclusivo y "hasta" exclusivo: 50 ≤ X < 85 → grave
    rangos: [
      { desde: 90, hasta: null, categoria: "esperado",    severidad: "ninguna" },
      { desde: 85, hasta: 90,   categoria: "reiterada",   severidad: "media" },
      { desde: 50, hasta: 85,   categoria: "grave",       severidad: "alta" },
      { desde: null, hasta: 50, categoria: "critica",     severidad: "critica" }
    ]
  }
}

{
  _id: ObjectId,
  codigo: "rendimiento",
  descripcion: "Umbrales de notas por área y promedio general",
  activa: true,
  parametros: {
    umbralAlto: 4.0,                 // promedio < 4.0 → alta
    umbralPreventivo: 4.5,           // 4.0 ≤ promedio < 4.5 → media (⏳ ¿5.0?)
    escalaNotas: [                   // categoría que se muestra en la ficha
      { desde: 6.0, categoria: "destacado" },
      { desde: 5.0, categoria: "bueno" },
      { desde: 4.0, categoria: "suficiente" },
      { desde: 1.0, categoria: "insuficiente" }
    ],
    decimalesPromedio: 1,            // ⏳ confirmar regla de redondeo de la escuela
    areasPrioritarias: ["lenguaje", "matematica"],
    general: {
      severidadMaximaSinArea: "media" // tope si Lenguaje y Matemática no tienen alerta
    }
  }
}
```

**`alertas`**: cada alerta detectada, con su historial.

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  anio: 2026,
  tipo: "rendimientoArea",    // ver sección 5
  area: "matematica",         // cuando aplica
  severidad: "alta",          // "informativa" | "media" | "alta" | "critica"
  detalle: { promedio: 3.8, umbral: 4.0 },
  fechaDeteccion: ISODate,
  estado: "activa",           // "activa" | "enSeguimiento" | "cerrada"
  cerradaPor: null,
  comentarioCierre: null
}
```

**`estadosAlumno`**: resumen materializado por alumno y año. Así el dashboard lee un solo documento por alumno en vez de recalcular todo en cada consulta.

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  anio: 2026,
  cursoId: ObjectId,
  semaforo: "rojo",                  // "verde" | "amarillo" | "naranjo" | "rojo"
  categoriaAsistencia: "reiterada",
  porcentajeAsistencia: 87.3,
  promedios: { general: 4.9, lenguaje: 3.8, matematica: 5.2 },
  alertasActivas: [ObjectId],
  resumen: "Rendimiento bajo solo en Lenguaje · Inasistencia reiterada",
  calculadoEn: ISODate
}
```

### 3.10 Otras colecciones

| Colección | Campos principales | Notas |
|-----------|-------------------|-------|
| `observaciones` | `alumnoId`, `autorId`, `tipo` (pedagogica, convivencia, psicosocial, pie, general), `texto`, `confidencial`, `fecha` | Las de tipo `psicosocial` y `pie` son **sensibles**. Para **crearlas o verlas** hay que tener `observaciones.verPsicosocial` o `pie.ver`, respectivamente. Sin esos permisos solo se crean las de tipo `pedagogica`, `convivencia` y `general` |
| `cargas` | `fuente` (miAulaNotas, miAulaAsistencia, letrapps, dia, sepa, simce), `nombreArchivo`, `usuarioId`, `estado`, `filasTotales`, `filasOk`, `errores[]` (`fila`, `campo`, `mensaje`), `iniciadaEn`, `finalizadaEn` | El archivo original **no** se conserva después de procesarlo |
| `usuarios` | `correo`, `nombre`, `rol`, `cursoIds[]`, `activo`, `ultimoAcceso` | Lista blanca: sin documento aquí no hay acceso. `cursoIds` son los cursos asignados; se usan cuando el rol tiene `alcance: "cursosAsignados"` |
| `roles` | `codigo`, `nombre`, `jerarquia`, `alcance` (`escuela` \| `cursosAsignados`), `permisos[]` | Editables por la Directora. `alcance` limita los datos que ve el rol (ver [sección 7.4](#74-alcance-por-curso)) |
| `registroAuditoria` | `usuarioId`, `accion`, `recurso`, `recursoId`, `alumnoId`, `ip`, `fecha` | Solo se agregan registros, nunca se editan. Se conservan por un tiempo definido (⏳ a acordar) |

---

## 4. Evaluaciones externas

### 4.1 Instrumentos

| Instrumento | Nivel de detalle | Áreas | Cursos | Momentos | Estado |
|-------------|-----------------|-------|--------|----------|--------|
| **Letrapps** | Por alumno | Lenguaje: es la **prueba de velocidad lectora** de la escuela (dominio lector: PPM, velocidad y calidad) | ⏳ a confirmar (hay muestra de 3°) | Mediciones numeradas (N° 1, N° 2…) | **MVP** |
| **DIA** (Agencia de Calidad) | Por alumno | Lectura y Matemática (el área socioemocional queda fuera de alcance) | ⏳ a confirmar (hay muestra de 3°) | Diagnóstico, monitoreo intermedio, cierre | **MVP** |
| **SEPA** (MIDE UC) | Por alumno | Lenguaje y Matemática | 2° básico | ⏳ a confirmar | **MVP** (⏳ formato de carga por definir) |
| **SIMCE** | Agregado de escuela | Lectura, Matemática (y otras según el año) | 4° todos los años; 6° y 8° se alternan | Anual | Módulo aparte, por definir |
| **Evaluaciones propias** | Por alumno | Configurable | Configurable | Configurable | Soportado por el catálogo |

Todos los detalles marcados con ⏳ se confirman con los archivos reales. El formato de cada instrumento está en la [sección 4.4](#44-formatos-recibidos).

### 4.2 Calendario del SIMCE

Según lo informado por la escuela:

| Año | Niveles evaluados |
|-----|-------------------|
| 2026 | 4° y 6° |
| 2027 | 4° y 8° |
| … | 4° todos los años; 6° en años pares y 8° en años impares (por verificar) |

El calendario **no se deja fijo en el código**: se guarda como configuración, porque la Agencia de Calidad puede cambiarlo.

### 4.3 Normalización a una escala común

Cada instrumento usa su propia escala: porcentaje de logro, categorías, palabras por minuto, puntaje estandarizado. Para que el motor de alertas los pueda combinar, cada resultado se traduce a un **nivel normalizado de 3 valores**:

| Nivel normalizado | Significado |
|-------------------|-------------|
| `bajo` | Bajo lo esperado; requiere apoyo |
| `medio` | Cerca de lo esperado; requiere monitoreo |
| `adecuado` | Logra lo esperado |

- La traducción la define `tiposEvaluacion.reglaNormalizacion`: un mapa de categorías, rangos numéricos o la comparación con el estándar del nivel.
- **Se guardan siempre ambos valores**: el resultado original (`resultados`) y el normalizado. La ficha muestra el dato original y las alertas usan el normalizado.
- Cada instrumento tiene **su propio criterio de medición**, y la traducción lo respeta:

| Instrumento | Criterio propio | Traducción propuesta |
|-------------|-----------------|----------------------|
| **Letrapps** | Categorías de velocidad y calidad, y un **estándar Mineduc** por nivel (en 3°: velocidad *Medio alta*, calidad *Unidades Cortas*) | `estandarNivel`: en el estándar o sobre él → `adecuado`; una categoría bajo él → `medio`; dos o más → `bajo`. ⏳ Confirmar con la escuela y obtener el estándar de cada nivel. ⏳ Definir si manda la velocidad, la calidad o la peor de las dos |
| **DIA** | Solo porcentajes por eje u OA, sin nivel de logro por alumno | `rangos` sobre el promedio de los porcentajes. ⏳ Cortes a definir por la escuela |
| **SEPA** | Porcentajes por eje, porcentaje del área y puntaje | ⏳ A definir cuando se tenga el formato de carga |

### 4.4 Formatos recibidos

Muestras anonimizadas que entregó la escuela (octubre 2026). Las muestras **no se guardan en el repositorio**; aquí solo se describe su estructura.

> **Ninguna fuente externa trae el RUT.** Todas identifican al alumno por nombre y n° de lista dentro del curso. Por eso la carga busca a cada alumno por curso y nombre (ver [sección 6.2](#62-reglas-de-la-carga)).

#### Letrapps (dominio lector)

- **Formato actual:** informe PDF por curso y medición ("Informe por curso · Gráfico de Barras · Dominio Lector"). El PDF tiene una capa de texto, así que se puede leer. ⏳ Consultar si Letrapps permite exportar a `.xlsx`; si lo permite, se prefiere ese formato.
- **Encabezado:** escuela, curso ("3° Básico A"), **medición** ("Medición N° 1"), **texto leído** ("Lectura: Cómo plantar un árbol") y avance ("Resultados 22 de 22 estudiantes · 100% de avance").
- **Tabla, una fila por alumno:**

| Columna | Ejemplo | Campo interno |
|---------|---------|---------------|
| `#` | 1 | n° de lista (solo de apoyo) |
| Nombre del Estudiante | APELLIDOS NOMBRES, en mayúsculas | se usa para identificar al alumno; no se guarda como dato del resultado |
| PPM | "66 ppm" | `ppm` (número; se quita " ppm") |
| Velocidad | "Lenta" | `velocidad` |
| Calidad | "Palabra a Palabra" | `calidad` |

- **Categorías de velocidad**, de menor a mayor: No Lector, Muy lenta, Lenta, Medio baja, Medio alta, Rápida, Muy rápida.
- **Categorías de calidad**, de menor a mayor: No Lector (NL), Silábica (SL), Palabra a Palabra (PP), Unidades Cortas (UC), Fluida (FL).
- **Estándar Mineduc:** los gráficos del informe muestran la categoría esperada para el nivel. En 3° básico es velocidad *Medio alta* y calidad *Unidades Cortas*. ⏳ Falta el estándar de los otros niveles.
- **Ojo:** una tabla larga puede seguir en la página siguiente, así que el parser debe leer todas las páginas antes de los gráficos.

#### DIA (Agencia de Calidad)

- **Formato:** `.xlsx`, un archivo por curso y área, con una sola hoja.
- **Encabezado:** fila 5 "Establecimiento", fila 6 "Curso" ("3 A"), fila 7 "Fecha de descarga de este reporte" ("23/04/2026 17:09:32").
- **Tabla:** encabezados en la fila 13 y datos desde la fila 14. La fila 12 es un título combinado sobre las columnas de resultados.
  - Columnas fijas: "Número de Lista" y "Nombre del Estudiante".
  - **Lectura:** título "EJES DE HABILIDAD" y columnas Localizar, Interpretar y relacionar, Reflexionar.
  - **Matemática:** título "Porcentaje de respuestas de cada estudiante según aprendizajes previos que son clave para abordar los OA basales del nivel actual" y una columna por OA (OA2, OA3, OA5…; en 3° son 12). Los OA cambian según el nivel.
- **Valores:** porcentajes guardados **como texto con coma decimal** ("73,08"). Se convierten a número.
- **No viene en el archivo:** el momento (diagnóstico, monitoreo o cierre), el año y un nivel de logro. El momento lo elige el usuario al subir el archivo. El área se reconoce por el título de la fila 12, y el usuario la confirma en la vista previa.
- Faltan algunos n° de lista (alumnos que no rindieron), así que **no** se puede suponer una lista correlativa.

#### SEPA (MIDE UC)

- **Formato actual:** solo informes PDF, con una tabla por alumno y un gráfico de distribución. La muestra recibida es una **imagen**, sin texto que se pueda leer.
- **Contenido (Lenguaje):** porcentaje por eje (exp: información explícita, imp: información implícita, sgl: sentido global, sce: situación comunicativa y elementos estructurales), "Porcentaje Lenguaje" y "Puntaje Lenguaje". Además trae filas de "Promedio del curso" y "Promedio sin NEEP", y una escala de colores de 0% a 100%.
- **Marcas del informe:** NEEP (necesidad educativa especial permanente), "A" (ausente o sin respuestas válidas) y (\*) (RUT erróneo). La marca NEEP es un **dato sensible PIE y no se importa** (minimización). "A" se registra como "sin resultado".
- ⏳ **Pendiente:** consultar si la plataforma SEPA permite descargar en Excel, y conseguir el informe de Matemática. Mientras tanto no se implementa el parser. Si no hay Excel, la alternativa es ingresar los datos a mano.

#### SIMCE

- Fuera del foco del MVP (módulo aparte). Al ser pocos datos agregados al año, se propone ingresarlos a mano.

---

## 5. Motor de alertas

### 5.1 Principios

- **Reglas configurables:** los umbrales viven en `reglasAlerta` y la Directora o Jefe Técnico los pueden ajustar sin programar.
- **Explicables:** cada alerta guarda en `detalle` los datos que la generaron, como el promedio y el umbral. La idea es que el personal entienda *por qué* salta una alerta.
- **Materializadas:** el resultado se guarda en `alertas` y `estadosAlumno`, así el dashboard es rápido.

### 5.2 Reglas

#### a) Asistencia

Criterios entregados por la escuela:

| % asistencia | Categoría | Severidad | Semáforo |
|--------------|-----------|-----------|----------|
| ≥ 90% | **Esperado** | — | 🟢 verde |
| 85% ≤ X < 90% | **Inasistencia reiterada** | media | 🟡 amarillo |
| 50% ≤ X < 85% | **Grave** | alta | 🟠 naranjo |
| < 50% | **Crítica** | crítica | 🔴 rojo |

- Los rangos se escriben como **intervalos continuos**: se usa `< 90%` en vez de "hasta 89%" y `< 85%` en vez de "hasta 84%". Así ningún porcentaje con decimales queda sin categoría (p. ej. 89,5% o 84,7%).
- **Exactamente 50%** cuenta como "Grave" (confirmado por la escuela).
- **El porcentaje se calcula por semestre** (confirmado). La categoría del alumno es la del semestre en curso. Los semestres anteriores quedan en el historial de la ficha.

#### b) Rendimiento por área (notas)

**Escala de notas de la escuela.** Se muestra en la ficha junto a cada promedio. Los rangos y nombres se configuran en `reglasAlerta`:

| Rango | Categoría | Nota |
|-------|-----------|------|
| 6.0 – 7.0 | **Destacado** | Criterio de la escuela |
| 5.0 – 5.9 | **Bueno** | La escuela lo llama "suficiente"; en Chile se suele llamar "bueno". ⏳ Confirmar el nombre |
| 4.0 – 4.9 | **Suficiente** | La escuela no le da nombre; en Chile se suele llamar "suficiente". ⏳ Confirmar el nombre |
| 1.0 – 3.9 | **Insuficiente** | Criterio de la escuela |

- ⏳ **Redondeo:** confirmar si los promedios se redondean a un decimal como es habitual (p. ej. 3,95 → 4,0). El cálculo usa la misma regla que la escuela, para no generar discrepancias con Mi Aula.

**Alertas.** Se importan las notas de **todas** las asignaturas. Con ellas se calculan tres promedios por alumno: **Lenguaje** (asignaturas con `area: "lenguaje"`), **Matemática** (`area: "matematica"`) y **general** (todas). Las asignaturas con `area: "otra"` no generan alertas propias; solo cuentan en el promedio general.

**Lenguaje y Matemática** son la prioridad:

| Condición | Severidad |
|-----------|-----------|
| Promedio < 4.0 | alta |
| 4.0 ≤ promedio < 4.5 (umbral preventivo) | media |

**Promedio general**, con un tope de severidad:

| Condición | Severidad |
|-----------|-----------|
| Promedio general < 4.5 y Lenguaje y Matemática **sin** alerta | media (**tope**: como máximo 🟡 amarillo) |
| Promedio general < 4.0 y Lenguaje o Matemática **con** alerta | alta |
| 4.0 ≤ promedio general < 4.5 y Lenguaje o Matemática **con** alerta | media |

- **Por qué el tope:** el promedio general se tiene en cuenta, pero por sí solo no enciende el naranjo ni el rojo. Esos colores quedan para Lenguaje, Matemática, la asistencia y las evaluaciones externas, que son la prioridad de la escuela.
- **"Solo en Lenguaje" / "Solo en Matemática":** si hay alerta en un área y no en la otra, el resumen del alumno lo dice explícitamente (p. ej. *"Rendimiento bajo solo en Lenguaje"*).
- **Solo el promedio general bajo:** el resumen lo aclara, p. ej. *"Promedio general bajo (Lenguaje y Matemática dentro de lo esperado)"*.
- Los umbrales (4.0 / 4.5) y el tope se configuran en `reglasAlerta` (ver [sección 3.9](#39-colecciones-de-alertas)).
- ⏳ **Umbral preventivo:** está en 4.5. Falta decidir con la escuela si se amplía a todo el rango "Suficiente" (4.0 – 4.9), es decir, `umbralPreventivo: 5.0`. Es un cambio de configuración, no de código.
- **PK y K:** no tienen notas numéricas, así que la regla usa los conceptos (p. ej. mayoría de "Por lograr"). ⏳ Se define al ver el formato de Mi Aula para estos niveles.

#### c) Evaluaciones externas

| Condición | Severidad |
|-----------|-----------|
| Último resultado del área (DIA, Letrapps o SEPA) en nivel `bajo` | alta |
| Último resultado en nivel `medio` y anterior también `medio` o peor | media |

#### d) Alertas cruzadas

- **Baja asistencia + bajo rendimiento:** si hay alerta de asistencia (reiterada o peor) y además alerta de rendimiento en Lenguaje o Matemática, la severidad **sube un nivel**. Es el caso central de la problemática. La alerta de promedio general con tope no hace subir el nivel.
- **Discrepancia entre notas y evaluaciones externas:** promedio del área ≥ 5.0, pero el resultado externo de la misma área está en nivel `bajo`, o al revés. Severidad **informativa**: no es necesariamente un problema del alumno, pero muestra las *discrepancias* entre fuentes que motivaron el proyecto.

#### e) Tendencia

- Baja del promedio de un área **≥ 0,5 puntos** entre semestres consecutivos → severidad media.
- Baja de la asistencia de una categoría a otra peor entre semestres → informativa. Si Mi Aula entrega el detalle mensual, también se puede comparar mes a mes dentro del semestre.

### 5.3 Semáforo del alumno

El semáforo de `estadosAlumno` corresponde a la **severidad más alta** entre sus alertas activas:

| Severidad máxima | Semáforo |
|------------------|----------|
| ninguna / informativa | 🟢 verde |
| media | 🟡 amarillo |
| alta | 🟠 naranjo |
| crítica | 🔴 rojo |

### 5.4 Cuándo se recalcula

1. **Después de cada carga:** al terminar el job de carga se encola un job `recalcularAlertas` en BullMQ, solo con los alumnos afectados.
2. **Al cambiar una regla:** se recalculan todos los alumnos del año en curso.
3. **Recálculo manual** desde la administración, por si algo queda inconsistente.

Una alerta que deja de cumplirse se **cierra automáticamente** y queda en el historial. El personal también puede ponerla en seguimiento o cerrarla con un comentario.

---

## 6. Carga de datos

### 6.1 Flujo

```text
 Usuario sube archivo ─▶ POST /api/cargas (multipart, fuente = miAulaNotas | …)
                             │
                             ├─ crea documento en `cargas` (estado: pendiente)
                             └─ encola job "procesarCarga" en BullMQ
                                          │
                         Worker ◀─────────┘
                           1. Lee XLSX/CSV con el parser de la fuente
                           2. Mapea columnas → campos internos (descarta el resto)
                           3. Valida cada fila (RUT, curso, asignatura, rangos)
                           4. Upsert de filas válidas; registra errores por fila
                           5. Borra el archivo temporal
                           6. Estado: completada | completadaConErrores | fallida
                           7. Encola "recalcularAlertas" (alumnos afectados)
                                          │
 Frontend consulta GET /api/cargas/:id ◀──┘  (avance e informe de errores)
```

### 6.2 Reglas de la carga

- **Un parser por fuente:** Mi Aula notas, Mi Aula asistencia, Letrapps, DIA y SEPA. Letrapps y DIA ya tienen formato conocido (sección 4.4). ⏳ Mi Aula y SEPA siguen pendientes de formato. El SIMCE se ingresa a mano.
- **Vista previa:** antes de confirmar, el usuario puede validar el archivo y ver cuántas filas se cargarían y qué errores hay, sin guardar nada.
- **Validación del RUT:** se normaliza (quita puntos, espacios y pasa el DV a mayúscula) y se valida el dígito verificador. Un RUT inválido es error de fila, no de todo el archivo.
- **Alumnos:** un alumno que no existe se crea desde la carga de Mi Aula, que es la fuente oficial de matrícula y la única que se espera que traiga el RUT (⏳ formato pendiente). Las cargas de evaluaciones externas **no** crean alumnos.
- **Identificación en evaluaciones externas** (Letrapps, DIA, SEPA), que no traen RUT (sección 4.4). El alumno se busca entre los **matriculados en el curso** del archivo, en este orden:
  1. por RUT, si el archivo lo trae;
  2. por **nombre normalizado**: sin tildes ni signos, en mayúsculas, con espacios simples y sin importar el orden de nombres y apellidos;
  3. el **n° de lista** solo sirve para desempatar. Nunca identifica por sí solo, porque cambia cuando entran o se retiran alumnos.
  
  Si no hay coincidencia o hay más de un candidato, la fila aparece en la **vista previa** para que el usuario elija al alumno o la descarte. Lo que el usuario elige se guarda como un alias del nombre en esa fuente, para no volver a preguntarlo en las cargas siguientes. El nombre que trae el archivo se usa solo para identificar al alumno y no se guarda en el resultado.
- **Valores especiales:** la marca de ausente (p. ej. "A" en SEPA, o un alumno que no aparece en el archivo) se registra como "sin resultado", nunca como 0%. En Letrapps, "No Lector" con 0 ppm **sí** es un resultado.
- **Alcance por curso:** si quien sube el archivo tiene un rol con `alcance: "cursosAsignados"` (p. ej. `docente`), las filas de cursos que no tiene asignados se marcan como **error de fila** y no se cargan. Esto incluye la creación de alumnos desde Mi Aula.
- **Idempotencia:** se usan upserts sobre las claves únicas (sección 3). Cargar dos veces el mismo archivo no duplica datos.
- **Minimización:** solo se leen las columnas mapeadas y el resto se descarta. El archivo original se elimina después de procesarlo.
- **Trazabilidad:** cada dato guarda el `cargaId` que lo originó.

### 6.3 Ingreso manual

Además de los archivos, se podrán ingresar o corregir datos a mano desde la ficha del alumno: una nota, un resultado de evaluación o una observación. Estos cambios quedan en el registro de auditoría.

---

## 7. Autenticación, roles y permisos

### 7.1 Inicio de sesión con Google

```text
 Frontend (botón "Iniciar sesión con Google", Google Identity Services)
     │ ID token
     ▼
 POST /api/autenticacion/google
     1. Verifica el ID token con google-auth-library (firma, audiencia = client ID, expiración)
     2. Verifica email_verified y el dominio institucional (claim `hd`)
     3. Busca el correo en `usuarios` → debe existir y estar activo (LISTA BLANCA)
     4. Emite un JWT propio en cookie httpOnly + Secure + SameSite=Lax (duración: jornada laboral)
     5. Registra el acceso en `registroAuditoria`
```

- **Lista blanca:** solo pueden entrar los correos que la Directora registró antes con un rol. Otro correo, aunque sea del dominio institucional, es rechazado.
- **Primer usuario:** la cuenta de la Directora se crea al iniciar el sistema a partir de una variable de entorno (`CORREO_DIRECTORA_INICIAL`).
- ⏳ **Dominio institucional:** por confirmar (¿`@slepuertocordillera.cl`?).
- ⏳ **Alineación con Datademy:** el enfoque final se ajusta al módulo de autenticación del proyecto Datademy del equipo, cuando se revise su repositorio.

### 7.2 Roles

En orden jerárquico:

| # | Código | Rol |
|---|--------|-----|
| 1 | `directora` | Directora — **acceso total** |
| 2 | `inspectorGeneral` | Inspector(a) General |
| 3 | `jefeTecnico` | Jefe(a) Técnico(a) (UTP) |
| 4 | `coordinadoraConvivencia` | Coordinador(a) de Convivencia Escolar |
| 5 | `evaluadora` | Evaluador(a) |
| 6 | `orientador` | Orientador(a) |
| 7 | `duplaPsicosocial` | Dupla Psicosocial |
| 8 | `coordinadoraPie` | Coordinador(a) PIE |
| 9 | `docente` | Docente — solo sus cursos asignados |

### 7.3 Permisos (propuesta a validar con la escuela)

Los permisos se guardan en la colección `roles` y la **Directora puede editarlos** desde la plataforma. El backend los exige con un decorador por ruta, por ejemplo `@RequierePermisos('alumnos.ver')`, y un guard global.

| Permiso | Dir. | Insp. | UTP | Conv. | Eval. | Orient. | Dupla | PIE | Doc.¹ |
|---------|:----:|:-----:|:---:|:-----:|:-----:|:-------:|:-----:|:---:|:-----:|
| `alumnos.ver` (ficha general, notas, asistencia, evaluaciones) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `alertas.ver` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `alertas.gestionar` (seguimiento / cierre) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `cargas.notas` (Mi Aula notas) | ✅ | — | ✅ | — | ✅ | — | — | — | ✅ |
| `cargas.asistencia` (Mi Aula asistencia) | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ |
| `cargas.evaluaciones` (Letrapps, DIA, SEPA, SIMCE) | ✅ | — | ✅ | — | ✅ | — | — | — | — |
| `observaciones.crear` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `observaciones.verPsicosocial` ⚠️ | ✅ | — | — | ✅ | — | ✅ | ✅ | — | — |
| `pie.ver` ⚠️ | ✅ | — | ✅ | — | — | — | — | ✅ | — |
| `simce.ver` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | —² |
| `reportes.exportar` | ✅ | — | ✅ | — | ✅ | — | — | — | — |
| `reglasAlerta.gestionar` | ✅ | — | ✅ | — | — | — | — | — | — |
| `usuarios.gestionar` | ✅ | — | — | — | — | — | — | — | — |
| `auditoria.ver` | ✅ | — | — | — | — | — | — | — | — |

⚠️ Datos **sensibles** según la Ley 21.719 (ver sección 8). Aunque un rol esté alto en la jerarquía, no ve estos datos si no los necesita para su función.

¹ **Docente:** todos sus permisos se limitan a los **cursos asignados** (ver [sección 7.4](#74-alcance-por-curso)). Puede ver la ficha y las alertas para tener contexto al registrar observaciones, pero no gestiona alertas. Solo crea observaciones de tipo `pedagogica`, `convivencia` y `general`.

² El SIMCE son datos agregados de escuela, sin datos personales. Queda en "—" hasta validarlo con la escuela.

**Implementación (PGT-7):**

| Archivo | Uso |
|---------|-----|
| `backend/src/usuarios/permisos.ts` | Catálogo `PERMISOS` (la tabla de arriba) y `ROLES_INICIALES` |
| `backend/src/usuarios/permisos.guard.ts` | Guard global (`APP_GUARD`) |
| `backend/src/usuarios/requiere-permisos.decorator.ts` | `@RequierePermisos(...)`, `@Publica()` y `@UsuarioActual()` |
| `backend/src/usuarios/alcance.ts` | Filtro por curso para los servicios (sección 7.4) |

- **Sesión:** el guard lee `request.sesion = { usuarioId }`, que llena el login (PGT-6) a partir del JWT. En cada request carga de la base el usuario y su rol, así que desactivar a alguien o cambiar sus permisos tiene efecto inmediato.
- **Respuestas:** sin sesión, o con un usuario inexistente o inactivo, responde **401**. Si falta un permiso, responde **403**.
- **Se deniega por defecto:** una ruta sin `@RequierePermisos` responde 403. Las rutas sin sesión (salud y, más adelante, el login) se marcan con `@Publica()`.
- **Roles iniciales:** se crean al iniciar la API si no existen, también en producción. Los ya existentes no se modifican, para no pisar lo que edite la Directora.
- `usuarios.rol` guarda el **código** del rol (p. ej. `"docente"`).
- Por ahora solo existe el rol `docente`, con los permisos de la tabla. ⏳ Faltan los demás roles.
- ⏳ **Pendiente:** registrar los accesos denegados en `registroAuditoria` (módulo de auditoría) y la administración de usuarios y roles (PGT-51).

### 7.4 Alcance por curso

Además de los permisos, cada rol tiene un **`alcance`** guardado en `roles`. Así se cumple el principio de minimización sin codificar nada por rol:

| `alcance` | Qué datos ve el rol | Roles (propuesta) |
|-----------|---------------------|-------------------|
| `escuela` | Todos los alumnos y cursos | Todos menos `docente` |
| `cursosAsignados` | Solo los alumnos matriculados en los cursos de `usuarios.cursoIds` | `docente` |

- **Dónde se aplica:** el guard de permisos revisa *qué* acción se puede hacer. Los servicios filtran *sobre qué datos* según `cursoIds`, en listados, dashboard, vista de curso, ficha, alertas, cargas (ver [sección 6.2](#62-reglas-de-la-carga)) y observaciones.
- **Acceso fuera del alcance:** pedir la ficha de un alumno de otro curso responde **403** y el intento queda en `registroAuditoria`.
- **Asignación:** la Directora asigna los cursos de cada usuario desde `/admin/usuarios`. ⏳ Por definir si se asignan como profesor jefe, por asignatura o ambos.
- Un usuario con alcance `cursosAsignados` y sin cursos asignados no ve ningún alumno.
- **Implementación (PGT-7):** el guard deja en `request.usuario` (decorador `@UsuarioActual()`) el alcance y los `cursoIds` del usuario. Los servicios filtran con `cursosPermitidos(usuario)`, que devuelve `null` para el alcance `escuela` y los cursos asignados en otro caso, y con `tieneAccesoACurso(usuario, cursoId)`.

---

## 8. Privacidad y protección de datos (Ley 21.719)

> ⚠️ **Esto no es asesoría legal.** Es una guía para diseñar el sistema según la nueva ley. Debe validarse con la unidad jurídica del SLEP Puerto Cordillera.

### 8.1 Marco general

- La **Ley 21.719** (publicada en diciembre de 2024) reemplaza casi por completo la Ley 19.628 sobre protección de la vida privada y crea la **Agencia de Protección de Datos Personales**. Entra en vigencia el **1 de diciembre de 2026** (verificar), en pleno desarrollo del proyecto.
- **Responsable del tratamiento:** la escuela o el SLEP, que deciden para qué se usan los datos.
- **Encargado del tratamiento:** el equipo de desarrollo, mientras tenga acceso a los datos. Solo puede tratarlos según las instrucciones del responsable y bajo confidencialidad. Se recomienda que el **convenio A+S** incluya una cláusula de tratamiento de datos. Si el hosting queda en un proveedor (escenarios 2 y 3 de la [sección 8.5](#85-escenarios-de-hosting)), ese proveedor también es encargado.
- **Base legal:** como organismo público, la escuela puede tratar los datos de sus alumnos dentro de sus funciones legales (educativas) sin pedir el consentimiento de cada apoderado. El límite es la **finalidad**: los datos se usan solo para el seguimiento pedagógico y de bienestar. Se recomienda **informar a las familias** que el tratamiento existe.
- **Datos de niños, niñas y adolescentes:** siempre se tratan atendiendo a su **interés superior**. Esto refuerza todas las medidas siguientes.

### 8.2 Datos sensibles

| Dato | Por qué es sensible | Medida en el sistema |
|------|---------------------|----------------------|
| Participación en PIE y tipo de NEE | Se relaciona con la salud o condición del alumno | Permiso `pie.ver` restringido; no se importan diagnósticos detallados |
| Observaciones psicosociales | Situación familiar, social o de salud | Tipo `psicosocial` con permiso `observaciones.verPsicosocial` |

### 8.3 De los principios de la ley a medidas en el sistema

| Principio / obligación | Medida concreta |
|------------------------|-----------------|
| **Finalidad** | El uso se limita a seguimiento pedagógico y alertas. No se comparten datos con terceros |
| **Minimización** | Solo se importan las columnas necesarias; el archivo original se borra después de procesarlo (sección 6) |
| **Seguridad** | HTTPS, cookies httpOnly, lista blanca, permisos por rol con el mínimo necesario, MongoDB y Redis sin exposición externa y con autenticación, cifrado en disco o en la base, respaldos |
| **Responsabilidad proactiva** | `registroAuditoria` guarda quién vio la ficha de qué alumno, quién cargó, exportó o cambió permisos |
| **Filtraciones** | Procedimiento para avisar a la Agencia y, según el riesgo, a los afectados. La auditoría permite saber el alcance |
| **Derechos de los titulares** (acceso, rectificación, supresión, oposición, portabilidad, bloqueo) | Exportar la ficha completa de un alumno, corregir datos (queda auditado) y bloquear o suprimir alumnos egresados según la política de conservación |
| **Conservación** | ⏳ Definir por cuánto tiempo se guardan los datos de alumnos retirados o egresados |
| **Desarrollo** | **Nunca subir datos reales al repositorio.** En desarrollo y pruebas se usan datos ficticios generados. Los archivos de ejemplo se anonimizan (nombres y RUT) |

### 8.4 Medidas que no dependen del hosting

Como el hosting todavía no está definido, el cumplimiento se apoya sobre todo en la **lógica de negocio** de la aplicación. Estas reglas se implementan **siempre**, en cualquiera de los escenarios de la [sección 8.5](#85-escenarios-de-hosting):

| Regla de negocio | Cómo se implementa |
|------------------|--------------------|
| **Finalidad** | Solo hay funciones de seguimiento pedagógico, de asistencia y de bienestar. No hay integraciones que envíen datos a terceros |
| **Minimización de columnas** | Cada parser lee solo las columnas mapeadas y el archivo original se borra al terminar (sección 6) |
| **Minimización por curso** | Los roles con `alcance: "cursosAsignados"` solo ven y cargan datos de sus cursos (sección 7.4) |
| **Datos sensibles** | Para crear o ver datos PIE y observaciones psicosociales hay que tener `pie.ver` u `observaciones.verPsicosocial`. Sin el permiso, la API ni siquiera devuelve esos campos |
| **Mínimo privilegio** | Permisos por rol en la base de datos. El menú y los endpoints dependen de esos permisos |
| **Auditoría** | `registroAuditoria` guarda (solo agregando registros) los accesos a fichas, los accesos denegados, las cargas, las exportaciones, las correcciones manuales y los cambios de usuarios, roles y permisos |
| **Logs sin datos personales** | Los logs técnicos usan identificadores (`alumnoId`, `cargaId`), no RUT, nombres ni notas |
| **Derechos de los titulares** | Exportar la ficha completa de un alumno, corregir datos (queda auditado), y bloquear o suprimir alumnos |
| **Conservación** | Marcar a los alumnos retirados o egresados y aplicar la política de conservación (⏳ plazo por definir) |
| **Filtraciones** | La auditoría permite saber qué datos y de qué alumnos se vieron comprometidos para avisar a la Agencia y a los afectados |
| **Desarrollo** | Datos ficticios en desarrollo y pruebas. Nunca datos reales en el repositorio |

### 8.5 Escenarios de hosting

⏳ **Por definir.** La aplicación se diseña para funcionar igual en los tres escenarios (ver [sección 2](#despliegue)). Cambian las obligaciones legales y de operación:

| | 1. Servidor de la escuela | 2. Servidor nacional | 3. PaaS externo |
|---|---|---|---|
| **Ubicación de los datos** | Chile, en la escuela | Chile, en un datacenter de un proveedor | Normalmente fuera de Chile |
| **Transferencia internacional** | No | No | **Sí** |
| **Encargados del tratamiento** | Solo el equipo de desarrollo (mientras tenga acceso) | El equipo y el proveedor de hosting | El equipo y el proveedor de hosting |
| **Quién mantiene el servidor** | La escuela o el SLEP | Compartido con el proveedor | Sobre todo el proveedor |
| **Requisito principal** | Capacidad técnica de la escuela | Contrato de encargo con el proveedor | Garantías para la transferencia y validación del SLEP |

**1. Servidor propio de la escuela**

- La aplicación se despliega en un **servidor de la escuela**, expuesto a través de su proxy.
- Los datos quedan **en Chile y bajo control de la institución**, así que en principio **no hay transferencia internacional**. Esto facilita el cumplimiento.
- **Obligaciones.** La escuela o el SLEP queda a cargo de la seguridad física y lógica del servidor. Se necesita:
  - HTTPS en el proxy;
  - MongoDB y Redis **sin exponer a internet** (solo red interna, con autenticación);
  - cifrado del disco o de la base de datos;
  - **respaldos periódicos fuera del mismo servidor**;
  - un responsable de mantener actualizados el sistema operativo, Docker y las dependencias.

**2. Servidor nacional (datacenter en Chile)**

- La aplicación corre en un VPS o servidor de un proveedor con **datacenter en Chile**.
- **No hay transferencia internacional** mientras los datos y los respaldos se queden en Chile. Hay que confirmar con el proveedor dónde guarda los respaldos.
- El proveedor pasa a ser **encargado del tratamiento**. Hace falta:
  - un **contrato de encargo** que fije confidencialidad, medidas de seguridad, el deber de avisar si hay filtraciones y la devolución o borrado de los datos al terminar el servicio;
  - las mismas medidas técnicas del escenario 1 (HTTPS, MongoDB y Redis sin exponer, cifrado, respaldos);
  - **validación del SLEP** antes de subir datos reales.

**3. PaaS externo**

- Si se usa un PaaS o servicios administrados con servidores fuera de Chile (Render, Railway, MongoDB Atlas u otros), **sí hay transferencia internacional** de datos personales, además de datos de menores y sensibles.
- En ese caso hay que:
  - identificar el país de destino y si ofrece un nivel de protección adecuado;
  - si no, contar con garantías adecuadas (p. ej. cláusulas contractuales con el proveedor);
  - documentar la transferencia;
  - **validarla con el SLEP antes de subir datos reales**.
- Si el proveedor permite elegir la región, conviene la más cercana con protección adecuada y cifrado en reposo.

**En todos los escenarios:** guardar los **respaldos** en una nube extranjera (Google Drive, S3, etc.) cuenta como transferencia internacional, aunque la aplicación corra en Chile.

---

## 9. Frontend (vistas)

| Ruta | Vista | Contenido |
|------|-------|-----------|
| `/ingresar` | Inicio de sesión | Botón de Google; mensaje claro si el correo no está autorizado |
| `/` | Dashboard | Resumen de la escuela: alumnos por semáforo, por categoría de asistencia y por área con alertas; filtro por curso |
| `/cursos/:id` | Vista de curso | Tabla de alumnos con semáforo, % de asistencia, promedios de Lenguaje y Matemática, último nivel en evaluaciones externas; ordenable y filtrable |
| `/alumnos/:id` | **Ficha del alumno** | Resumen y semáforo; asistencia en el tiempo; notas por asignatura (Lenguaje y Matemática destacadas); línea de tiempo de evaluaciones externas; alertas activas e historial; observaciones (según permisos) |
| `/cargas` | Cargas | Subir archivo por fuente, vista previa, avance e informe de errores por fila, historial de cargas |
| `/simce` | SIMCE | ⏳ Placeholder: resultados de la escuela por año, nivel y asignatura |
| `/admin/usuarios` | Usuarios | Lista blanca: agregar o desactivar correos, asignar roles y, a los docentes, sus cursos |
| `/admin/roles` | Roles y permisos | Matriz editable (solo Directora) |
| `/admin/reglas` | Reglas de alerta | Edición de umbrales |
| `/admin/auditoria` | Auditoría | Consulta del registro de accesos (solo Directora) |

- El menú se arma según los permisos del usuario: lo que no puede usar no aparece.
- Para un usuario con alcance `cursosAsignados`, el dashboard, los selectores de curso y las búsquedas muestran solo sus cursos.
- Los colores del semáforo van acompañados de texto o ícono, para no depender solo del color (accesibilidad).

---

## 10. Preguntas abiertas y próximos pasos

### 10.1 Preguntas abiertas

**Datos y formatos**

- [ ] Formatos de exportación de **Mi Aula** (notas, asistencia y, si existe, nómina de alumnos): ¿trae RUT? ¿Notas parciales o solo promedios? ¿Asistencia diaria, mensual o semestral? ¿Cómo vienen PK y K?
- [x] Formatos de **Letrapps** y **DIA**: recibidos y descritos en la sección 4.4.
- [ ] ¿**Letrapps** permite exportar a `.xlsx`? Si no, se lee el PDF.
- [ ] ¿La plataforma **SEPA** permite descargar en Excel? Falta además el informe de Matemática.
- [ ] En qué cursos y momentos se aplica cada instrumento, y cuántas mediciones de Letrapps hay al año.
- [x] ¿Qué es la "prueba de velocidad lectora" de la propuesta? → Es **Letrapps**, con resultados por alumno.
- [x] Calendario de la escuela → **semestres**.
- [x] Letra del curso → hoy hay un curso por nivel y la letra que traen los instrumentos ("3 A") es solo de formato. A futuro podría haber letras (3° A y 3° B); el modelo ya lo soporta (sección 3.2).

**Reglas de alerta**

- [x] **Asistencia exactamente 50%** → "Grave".
- [x] ¿Cómo se mide la asistencia? → **Por semestre**.
- [x] Escala de notas de la escuela → recibida (sección 5.2 b).
- [ ] Nombres de las categorías 5.0–5.9 y 4.0–4.9 ("Bueno" y "Suficiente").
- [ ] **Umbral preventivo:** ¿4.5 o todo el rango 4.0–4.9? Y validar la regla de tendencia.
- [ ] **Redondeo** de los promedios (¿3,95 → 4,0?).
- [ ] **Normalización:** estándar Mineduc de Letrapps para cada nivel (y si manda la velocidad, la calidad o la peor de las dos), y cortes de porcentaje para el DIA y SEPA.

**Usuarios y acceso**

- [ ] Dominio del correo institucional.
- [ ] Validar la matriz de permisos por rol, especialmente el acceso a datos PIE y psicosociales.
- [ ] **Docentes:** ¿los cursos se asignan como profesor jefe, por asignatura o ambos? ¿El docente puede ver el módulo SIMCE (`simce.ver`)?
- [ ] Revisar el repositorio de **Datademy** para alinear el módulo de autenticación.

**Infraestructura y legal**

- [ ] **Decisión de hosting:** servidor de la escuela, servidor nacional o PaaS externo (ver [sección 8.5](#85-escenarios-de-hosting)).
- [ ] Si se usa el servidor de la escuela: sistema operativo, RAM, disco, si admite Docker, quién lo administra, política de respaldos.
- [ ] Confirmación del **SLEP** sobre el hosting y el convenio de tratamiento de datos (y el contrato de encargo con el proveedor, si se usa uno).
- [ ] Política de conservación de datos de alumnos egresados o retirados.

**SIMCE**

- [ ] Qué se quiere ver en el módulo SIMCE (evolución histórica, comparación entre niveles, distribución por niveles de logro, etc.).

### 10.2 Hoja de ruta propuesta

| Etapa | Contenido | Depende de |
|-------|-----------|------------|
| **0. Diseño** | Este documento; revisión con el equipo, el profesor y la escuela | — |
| **1. Base** | Docker Compose, configuración, MongoDB, BullMQ, login con Google y lista blanca, roles y permisos con alcance por curso, auditoría, cursos, asignaturas y alumnos con datos ficticios, estructura del frontend | Dominio institucional, repo Datademy |
| **2. Mi Aula + alertas** | Cargas de notas y asistencia, motor de alertas (asistencia, rendimiento por área, tendencia), dashboard, vista de curso, ficha del alumno | Formatos de Mi Aula |
| **3. Evaluaciones externas** | Parsers de Letrapps, DIA y SEPA, identificación por nombre con resolución en la vista previa, normalización, alertas externas, cruzadas y de discrepancia | Nómina de Mi Aula, criterios de normalización, formato de carga de SEPA |
| **4. Cierre** | Observaciones, módulo SIMCE, exportación de ficha (derechos de los titulares), endurecimiento de seguridad, despliegue en el hosting elegido, capacitación | Definición SIMCE, decisión de hosting |
| **Futuro** | Registro de asistencia en la plataforma, notificaciones a apoderados, justificación de inasistencias, multi-escuela | Nuevos requerimientos |
