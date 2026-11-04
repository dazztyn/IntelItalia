import { useQuery } from '@tanstack/react-query'
import { obtenerFicha } from '../api/alumnos'
import { listarAlumnosDeCurso, listarCursos } from '../api/cursos'

export function useCursos() {
  return useQuery({ queryKey: ['cursos'], queryFn: () => listarCursos() })
}

export function useAlumnosDeCurso(cursoId: string | null) {
  return useQuery({
    queryKey: ['cursos', cursoId, 'alumnos'],
    queryFn: () => listarAlumnosDeCurso(cursoId as string),
    enabled: cursoId !== null,
  })
}

export function useFicha(alumnoId: string) {
  return useQuery({
    queryKey: ['alumnos', alumnoId],
    queryFn: () => obtenerFicha(alumnoId),
    staleTime: Infinity,
  })
}