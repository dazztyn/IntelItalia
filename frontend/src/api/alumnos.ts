import { pedir } from './cliente'
import type { FichaAlumno } from './types'

export function obtenerFicha(alumnoId: string): Promise<FichaAlumno> {
  return pedir<FichaAlumno>(`/alumnos/${encodeURIComponent(alumnoId)}`)
}