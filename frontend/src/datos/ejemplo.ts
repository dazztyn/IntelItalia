
import type { Semaforo } from '../api/types'

export interface AlumnoResumen {
  id: string
  nombre: string
  curso: string
  asistencia: number
  lenguaje: number
  matematica: number
  semaforo: Semaforo
}

export const ALUMNOS_EJEMPLO: AlumnoResumen[] = [
  { id: '1', nombre: 'Sofía Rojas Díaz', curso: '3° Básico', asistencia: 96.2, lenguaje: 6.1, matematica: 5.8, semaforo: 'verde' },
  { id: '2', nombre: 'Tomás Muñoz Silva', curso: '3° Básico', asistencia: 87.5, lenguaje: 5.2, matematica: 5.0, semaforo: 'amarillo' },
  { id: '3', nombre: 'Isidora Pérez Soto', curso: '4° Básico', asistencia: 92.0, lenguaje: 3.8, matematica: 5.4, semaforo: 'naranjo' },
  { id: '4', nombre: 'Benjamín Araya Torres', curso: '4° Básico', asistencia: 46.3, lenguaje: 4.2, matematica: 3.9, semaforo: 'rojo' },
  { id: '5', nombre: 'Martina Castillo Reyes', curso: '5° Básico', asistencia: 98.1, lenguaje: 6.6, matematica: 6.3, semaforo: 'verde' },
  { id: '6', nombre: 'Vicente Flores Tapia', curso: '5° Básico', asistencia: 91.2, lenguaje: 4.9, matematica: 3.7, semaforo: 'naranjo' },
  { id: '7', nombre: 'Josefa Morales Vega', curso: '6° Básico', asistencia: 90.7, lenguaje: 4.4, matematica: 5.6, semaforo: 'amarillo' },
  { id: '8', nombre: 'Lucas Fuentes Castro', curso: '7° Básico', asistencia: 94.8, lenguaje: 5.5, matematica: 5.9, semaforo: 'verde' },
]

export const RESUMEN_EJEMPLO = {
  totalAlumnos: 200,
  promedioGeneral: 5.4,
  asistenciaPromedio: 88.6,
  promedioLenguaje: 5.1,
  promedioMatematica: 4.9,
  semaforo: { verde: 121, amarillo: 42, naranjo: 25, rojo: 12 } satisfies Record<Semaforo, number>,
}