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

Personal directivo y profesionales de la escuela, organizados en ocho roles (ver [sección 7](#7-autenticación-roles-y-permisos)). No hay acceso para apoderados ni alumnos en esta etapa.

### Alcance del MVP (mínimo aceptable)

Lo que la plataforma **debe centralizar y usar para emitir alertas**, siempre **por alumno**:

| # | Fuente | Datos | Uso en alertas |
|---|--------|-------|----------------|
| 1 | **Mi Aula** (exportación) | **Notas por curso y asignatura** y **asistencia** | Base de las alertas de rendimiento y de inasistencia |
| 2 | **Letrapps** | Resultados de lectura | Alertas de Lenguaje |
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
- Pensado para el **servidor propio de la escuela**, detrás de su proxy. HTTPS termina en el proxy o en el Nginx interno.
- **Solo el proxy queda expuesto a la red.** MongoDB y Redis quedan en la red interna de Docker, con autenticación activada y sin puertos publicados.
- El mismo `docker-compose.yml` sirve si luego se opta por un hosting externo (ver [sección 8](#8-privacidad-y-protección-de-datos-ley-21719) sobre transferencia internacional).
- La configuración va en variables de entorno (`.env`, nunca en el repositorio), validadas al iniciar con `@nestjs/config`.

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
  apellidoMaterno: "Soto",
  fechaNacimiento: ISODate,
  matriculas: [
    { anio: 2026, cursoId: ObjectId, estado: "activa" }   // activa | retirada | trasladada
  ],
  pie: {                       // ⚠️ dato sensible: solo roles autorizados (ver sección 7)
    participa: true,
    tipoNee: "transitoria"     // transitoria | permanente
  }
}
```

- **Índices:** `rut` único (parcial, cuando no es `null`), `ipe` único (parcial), `matriculas.anio + matriculas.cursoId`.
- El RUT se valida con el dígito verificador (módulo 11) antes de guardarse.
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
- Al cargar archivos, el curso se resuelve por nivel + letra. Si el archivo no trae letra y el nivel tiene un solo curso, se asigna a ese. Si hay más de uno, la fila se marca como **error que hay que resolver**.

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

### 3.4 `calificaciones`

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  cursoId: ObjectId,
  asignaturaId: ObjectId,
  periodo: "2026-S1",         // semestre (o trimestre, según el calendario de la escuela)
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

- ⏳ La granularidad (diaria o mensual) depende de la exportación de Mi Aula. Si viene por día, se guarda por día y el porcentaje se calcula en una agregación.

### 3.6 `tiposEvaluacion`

Catálogo que describe **cómo se lee y cómo se normaliza** cada instrumento. Agregar una evaluación nueva, como una prueba propia de la escuela, es crear un documento aquí, no programar.

```js
{
  _id: ObjectId,
  codigo: "DIA",
  nombre: "Diagnóstico Integral de Aprendizajes",
  areas: ["lenguaje", "matematica"],
  niveles: ["2", "3", "4", "5", "6", "7", "8"],        // ⏳ a confirmar
  momentos: ["diagnostico", "monitoreo", "cierre"],
  campos: [                                            // qué trae cada resultado
    { clave: "porcentajeLogro", tipo: "numero", min: 0, max: 100 },
    { clave: "nivelLogro", tipo: "categoria" }
  ],
  reglaNormalizacion: {                                // cómo llegar al nivel común
    campo: "nivelLogro",
    mapa: { /* ⏳ categoría original → "bajo" | "medio" | "adecuado" */ }
  },
  activo: true
}
```

### 3.7 `resultadosEvaluacion`

```js
{
  _id: ObjectId,
  alumnoId: ObjectId,
  tipoEvaluacionId: ObjectId,
  cursoId: ObjectId,
  anio: 2026,
  momento: "diagnostico",
  area: "lenguaje",
  resultados: { porcentajeLogro: 42, nivelLogro: "…" },  // forma libre, según tiposEvaluacion.campos
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
| `observaciones` | `alumnoId`, `autorId`, `tipo` (pedagogica, convivencia, psicosocial, pie, general), `texto`, `confidencial`, `fecha` | Las de tipo `psicosocial` y `pie` son **sensibles** y quedan restringidas por rol |
| `cargas` | `fuente` (miAulaNotas, miAulaAsistencia, letrapps, dia, sepa, simce), `nombreArchivo`, `usuarioId`, `estado`, `filasTotales`, `filasOk`, `errores[]` (`fila`, `campo`, `mensaje`), `iniciadaEn`, `finalizadaEn` | El archivo original **no** se conserva después de procesarlo |
| `usuarios` | `correo`, `nombre`, `rol`, `activo`, `ultimoAcceso` | Lista blanca: sin documento aquí no hay acceso |
| `roles` | `codigo`, `nombre`, `jerarquia`, `permisos[]` | Editables por la Directora |
| `registroAuditoria` | `usuarioId`, `accion`, `recurso`, `recursoId`, `alumnoId`, `ip`, `fecha` | Solo se agregan registros, nunca se editan. Se conservan por un tiempo definido (⏳ a acordar) |

---

## 4. Evaluaciones externas

### 4.1 Instrumentos

| Instrumento | Nivel de detalle | Áreas | Cursos | Momentos | Estado |
|-------------|-----------------|-------|--------|----------|--------|
| **Letrapps** | Por alumno | Lenguaje (lectura: velocidad y comprensión lectora) | ⏳ a confirmar | ⏳ varias mediciones al año | **MVP** |
| **DIA** (Agencia de Calidad) | Por alumno | Lectura y Matemática (el área socioemocional queda fuera de alcance) | ⏳ a confirmar | Diagnóstico, monitoreo intermedio, cierre | **MVP** |
| **SEPA** | Por alumno | Lenguaje y Matemática | 2° básico | ⏳ a confirmar | **MVP** |
| **SIMCE** | Agregado de escuela | Lectura, Matemática (y otras según el año) | 4° todos los años; 6° y 8° se alternan | Anual | Módulo aparte, por definir |
| **Evaluaciones propias** | Por alumno | Configurable | Configurable | Configurable | Soportado por el catálogo |

Todos los detalles marcados con ⏳ se confirman con los archivos reales.

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

- La traducción la define `tiposEvaluacion.reglaNormalizacion`, ya sea un mapa de categorías o rangos numéricos.
- **Se guardan siempre ambos valores**: el resultado original (`resultados`) y el normalizado. La ficha muestra el dato original y las alertas usan el normalizado.
- ⏳ Las tablas de traducción de Letrapps, DIA y SEPA se definen al revisar sus formatos, idealmente usando las categorías que ya entrega cada instrumento.

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
- ⚠️ **Por confirmar con la escuela:** los criterios originales no incluyen el valor **exacto 50%** en ninguna categoría. Por ahora queda en "Grave".
- ⏳ Por definir: si el porcentaje se calcula **acumulado del año** (propuesta por defecto), por mes o por semestre.

#### b) Rendimiento por área (notas)

Por cada área (`lenguaje`, `matematica`) y para el promedio general:

| Condición | Severidad |
|-----------|-----------|
| Promedio < 4.0 | alta |
| 4.0 ≤ promedio < 4.5 (umbral preventivo) | media |

- **"Solo en Lenguaje" / "Solo en Matemática":** si hay alerta en un área y no en la otra, el resumen del alumno lo dice explícitamente (p. ej. *"Rendimiento bajo solo en Lenguaje"*).
- **PK y K:** no tienen notas numéricas, así que la regla usa los conceptos (p. ej. mayoría de "Por lograr"). ⏳ Se define al ver el formato de Mi Aula para estos niveles.

#### c) Evaluaciones externas

| Condición | Severidad |
|-----------|-----------|
| Último resultado del área (DIA, Letrapps o SEPA) en nivel `bajo` | alta |
| Último resultado en nivel `medio` y anterior también `medio` o peor | media |

#### d) Alertas cruzadas

- **Baja asistencia + bajo rendimiento:** si hay alerta de asistencia (reiterada o peor) y además alerta de rendimiento en cualquier área, la severidad **sube un nivel**. Es el caso central de la problemática.
- **Discrepancia entre notas y evaluaciones externas:** promedio del área ≥ 5.0, pero el resultado externo de la misma área está en nivel `bajo`, o al revés. Severidad **informativa**: no es necesariamente un problema del alumno, pero muestra las *discrepancias* entre fuentes que motivaron el proyecto.

#### e) Tendencia

- Baja del promedio de un área **≥ 0,5 puntos** entre períodos consecutivos → severidad media.
- Baja de la asistencia de una categoría a otra peor entre meses → informativa.

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

- **Un parser por fuente:** Mi Aula notas, Mi Aula asistencia, Letrapps, DIA, SEPA y SIMCE. ⏳ Todos pendientes de formato.
- **Vista previa:** antes de confirmar, el usuario puede validar el archivo y ver cuántas filas se cargarían y qué errores hay, sin guardar nada.
- **Validación del RUT:** se normaliza (quita puntos, espacios y pasa el DV a mayúscula) y se valida el dígito verificador. Un RUT inválido es error de fila, no de todo el archivo.
- **Alumnos:** un alumno que no existe se crea desde la carga de Mi Aula, que es la fuente oficial de matrícula. Las cargas de evaluaciones externas **no** crean alumnos; si no se encuentra el RUT, la fila se marca como error.
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

### 7.3 Permisos (propuesta a validar con la escuela)

Los permisos se guardan en la colección `roles` y la **Directora puede editarlos** desde la plataforma. El backend los exige con un decorador por ruta, por ejemplo `@RequierePermisos('alumnos.ver')`, y un guard global.

| Permiso | Dir. | Insp. | UTP | Conv. | Eval. | Orient. | Dupla | PIE |
|---------|:----:|:-----:|:---:|:-----:|:-----:|:-------:|:-----:|:---:|
| `alumnos.ver` (ficha general, notas, asistencia, evaluaciones) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `alertas.ver` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `alertas.gestionar` (seguimiento / cierre) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cargas.notas` (Mi Aula notas) | ✅ | — | ✅ | — | ✅ | — | — | — |
| `cargas.asistencia` (Mi Aula asistencia) | ✅ | ✅ | ✅ | — | — | — | — | — |
| `cargas.evaluaciones` (Letrapps, DIA, SEPA, SIMCE) | ✅ | — | ✅ | — | ✅ | — | — | — |
| `observaciones.crear` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `observaciones.verPsicosocial` ⚠️ | ✅ | — | — | ✅ | — | ✅ | ✅ | — |
| `pie.ver` ⚠️ | ✅ | — | ✅ | — | — | — | — | ✅ |
| `simce.ver` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reportes.exportar` | ✅ | — | ✅ | — | ✅ | — | — | — |
| `reglasAlerta.gestionar` | ✅ | — | ✅ | — | — | — | — | — |
| `usuarios.gestionar` | ✅ | — | — | — | — | — | — | — |
| `auditoria.ver` | ✅ | — | — | — | — | — | — | — |

⚠️ Datos **sensibles** según la Ley 21.719 (ver sección 8). Aunque un rol esté alto en la jerarquía, no ve estos datos si no los necesita para su función.

---

## 8. Privacidad y protección de datos (Ley 21.719)

> ⚠️ **Esto no es asesoría legal.** Es una guía para diseñar el sistema según la nueva ley. Debe validarse con la unidad jurídica del SLEP Puerto Cordillera.

### 8.1 Marco general

- La **Ley 21.719** (publicada en diciembre de 2024) reemplaza casi por completo la Ley 19.628 sobre protección de la vida privada y crea la **Agencia de Protección de Datos Personales**. Entra en vigencia el **1 de diciembre de 2026** (verificar), en pleno desarrollo del proyecto.
- **Responsable del tratamiento:** la escuela o el SLEP, que deciden para qué se usan los datos.
- **Encargado del tratamiento:** el equipo de desarrollo, mientras tenga acceso a los datos. Solo puede tratarlos según las instrucciones del responsable y bajo confidencialidad. Se recomienda que el **convenio A+S** incluya una cláusula de tratamiento de datos.
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

### 8.4 Hosting y transferencia internacional

**Escenario actual (en evaluación): servidor propio de la escuela**

- La aplicación se despliega en un **servidor de la escuela**, expuesto a través de su proxy.
- Los datos quedan **en Chile y bajo control de la institución**, así que en principio **no hay transferencia internacional**. Esto facilita el cumplimiento.
- **Obligaciones de este escenario.** La escuela o el SLEP queda a cargo de la seguridad física y lógica del servidor. Se necesita:
  - HTTPS en el proxy;
  - MongoDB y Redis **sin exponer a internet** (solo red interna, con autenticación);
  - cifrado del disco o de la base de datos;
  - **respaldos periódicos fuera del mismo servidor**;
  - un responsable de mantener actualizados el sistema operativo, Docker y las dependencias.

**Escenario alternativo (por si acaso): hosting externo**

- Si se opta por un hosting externo con servidores fuera de Chile (Render, Railway, MongoDB Atlas u otros), **sí hay transferencia internacional** de datos personales, además de datos de menores y sensibles.
- En ese caso hay que:
  - identificar el país de destino y si ofrece un nivel de protección adecuado;
  - si no, contar con garantías adecuadas (p. ej. cláusulas contractuales con el proveedor);
  - documentar la transferencia;
  - **validarla con el SLEP antes de subir datos reales**.
- **Ojo:** esto aplica aunque la aplicación corra en la escuela si los **respaldos** se guardan en una nube extranjera (Google Drive, S3, etc.).

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
| `/admin/usuarios` | Usuarios | Lista blanca: agregar o desactivar correos, asignar roles |
| `/admin/roles` | Roles y permisos | Matriz editable (solo Directora) |
| `/admin/reglas` | Reglas de alerta | Edición de umbrales |
| `/admin/auditoria` | Auditoría | Consulta del registro de accesos (solo Directora) |

- El menú se arma según los permisos del usuario: lo que no puede usar no aparece.
- Los colores del semáforo van acompañados de texto o ícono, para no depender solo del color (accesibilidad).

---

## 10. Preguntas abiertas y próximos pasos

### 10.1 Preguntas abiertas

**Datos y formatos**

- [ ] Formatos de exportación de **Mi Aula** (notas y asistencia): ¿notas parciales o solo promedios? ¿Asistencia diaria o mensual? ¿Cómo vienen PK y K?
- [ ] Formatos de **Letrapps**, **DIA** y **SEPA**: columnas, escalas, categorías y en qué cursos y momentos se aplica cada uno.
- [ ] Calendario de la escuela: ¿semestres o trimestres?

**Reglas de alerta**

- [ ] **Asistencia exactamente 50%:** ¿"Grave" o "Crítica"?
- [ ] ¿La asistencia se evalúa **acumulada del año**, por mes o por semestre?
- [ ] Validar los umbrales de rendimiento (4.0 / 4.5) y la regla de tendencia.

**Usuarios y acceso**

- [ ] Dominio del correo institucional.
- [ ] Validar la matriz de permisos por rol, especialmente el acceso a datos PIE y psicosociales.
- [ ] Revisar el repositorio de **Datademy** para alinear el módulo de autenticación.

**Infraestructura y legal**

- [ ] Especificaciones del **servidor de la escuela**: sistema operativo, RAM, disco, si admite Docker, quién lo administra, política de respaldos.
- [ ] Confirmación del **SLEP** sobre el hosting y el convenio de tratamiento de datos.
- [ ] Política de conservación de datos de alumnos egresados o retirados.

**SIMCE**

- [ ] Qué se quiere ver en el módulo SIMCE (evolución histórica, comparación entre niveles, distribución por niveles de logro, etc.).

### 10.2 Hoja de ruta propuesta

| Etapa | Contenido | Depende de |
|-------|-----------|------------|
| **0. Diseño** | Este documento; revisión con el equipo, el profesor y la escuela | — |
| **1. Base** | Docker Compose, configuración, MongoDB, BullMQ, login con Google y lista blanca, roles y permisos, auditoría, cursos, asignaturas y alumnos con datos ficticios, estructura del frontend | Dominio institucional, repo Datademy |
| **2. Mi Aula + alertas** | Cargas de notas y asistencia, motor de alertas (asistencia, rendimiento por área, tendencia), dashboard, vista de curso, ficha del alumno | Formatos de Mi Aula |
| **3. Evaluaciones externas** | Parsers de Letrapps, DIA y SEPA, normalización, alertas externas, cruzadas y de discrepancia | Formatos de cada instrumento |
| **4. Cierre** | Observaciones, módulo SIMCE, exportación de ficha (derechos de los titulares), endurecimiento de seguridad, despliegue en el servidor de la escuela, capacitación | Definición SIMCE, servidor |
| **Futuro** | Notificaciones a apoderados, justificación de inasistencias, multi-escuela | Nuevos requerimientos |
