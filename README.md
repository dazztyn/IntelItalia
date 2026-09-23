# IntelItalia

**IntelItalia** es una plataforma enfocada en la recopilación de datos y seguimiento estudiantil desarrollada a medida para la **Escuela Básica República de Italia** (Coquimbo). 

## Propósito del Proyecto

Actualmente, la escuela maneja datos de asistencia, calificaciones y evaluaciones externas de manera fragmentada. IntelItalia busca centralizar esta información mediante la ingesta de archivos (Excel/CSV) y el uso de bases de datos documentales para generar un cruce analítico. 

El objetivo principal es proveer a la directiva y docentes un **sistema de alertas visuales** que permita identificar tempranamente a los alumnos con niveles críticos de inasistencia o bajo rendimiento, facilitando la toma de decisiones y el apoyo oportuno.

## Funcionalidades Principales

- **Ingesta de Datos:** Carga masiva de datos mediante archivos estandarizados (Excel/CSV).
- **Ficha Integral del Alumno:** Visualización unificada de datos por estudiante en formato documental.
- **Cruce de Evaluaciones:** Integración de promedios internos con pruebas estandarizadas y métricas de lectura.
- **Sistema de Alertas:** Cálculo automatizado del estado de riesgo del alumno basado en su asistencia y rendimiento.
- **Registro de Observaciones:** Historial de anotaciones por parte de funcionarios y especialistas.

## Stack Tecnológico

El proyecto está estructurado en un monorepo separando el cliente y el servidor:

*   **Frontend:** React (Vite)
*   **Backend:** NestJS (TypeScript)
*   **Base de Datos Principal:** MongoDB (Modelo Documental)
*   **Caché y Colas:** Redis (Para procesamiento de Excels en segundo plano)
*   **Despliegue:** Docker (servidor propio de la escuela; hosting externo como alternativa)

## Documentación

- [Arquitectura y diseño](docs/ARQUITECTURA.md): modelo de datos, motor de alertas, carga de datos, roles y permisos, y privacidad (Ley 21.719).

## Estructura del Repositorio

```text
intelitalia/
├── backend/                # API REST construida con NestJS
│   ├── src/
│   ├── test/
│   └── package.json
├── frontend/               # SPA construida con React y Vite
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
