import { useQuery } from '@tanstack/react-query'
import { obtenerFicha } from '../api/alumnos'
import { listarCargas } from '../api/cargas'
import { listarAlumnosDeCurso, listarCursos } from '../api/cursos'

export function useCursos() {
  return useQuery({ queryKey: ['cursos'], queryFn: () => listarCursos() })
}

export function useCargas() {
  return useQuery({ queryKey: ['cargas'], queryFn: listarCargas })
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