import { pedir } from './cliente'
import type { AlumnoListado, Curso } from './types'
export function listarCursos(anio?: number): Promise<Curso[]> {
  return pedir<Curso[]>(anio ? `/cursos?anio=${anio}` : '/cursos')
}

export function listarAlumnosDeCurso(cursoId: string): Promise<AlumnoListado[]> {
  return pedir<AlumnoListado[]>(`/cursos/${encodeURIComponent(cursoId)}/alumnos`)
}