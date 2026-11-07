export const PERMISOS = [
  'alumnos.ver',
  'alertas.ver',
  'alertas.gestionar',
  'cargas.notas',
  'cargas.asistencia',
  'cargas.evaluaciones',
  'observaciones.crear',
  'observaciones.verPsicosocial',
  'pie.ver',
  'simce.ver',
  'reportes.exportar',
  'reglasAlerta.gestionar',
  'cursos.gestionar',
  'usuarios.gestionar',
  'auditoria.ver',
] as const
export type Permiso = (typeof PERMISOS)[number]

export type Alcance = 'escuela' | 'cursosAsignados'

export interface Usuario {
  id: string
  correo: string
  nombre: string
  rol: string
  alcance: Alcance
  permisos: Permiso[]
  cursoIds: string[]
}
export type Semaforo = 'verde' | 'amarillo' | 'naranjo' | 'rojo'

export interface Curso {
  id: string
  anio: number
  nivel: string
  letra: string | null
  nombre: string
}

export interface AlumnoListado {
  id: string
  rut: string | null
  ipe: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
}

export type Area = 'lenguaje' | 'matematica' | 'otra'

export interface ResultadoEvaluacionFicha {
  tipo: string
  nombre: string
  anio: number
  momento: string
  area: Area
  resultados: Record<string, unknown>
  nivelNormalizado: 'bajo' | 'medio' | 'adecuado' | null
}

export interface FichaAlumno extends AlumnoListado {
  matriculas: Array<{
    anio: number
    estado: 'activa' | 'retirada' | 'trasladada'
    curso: { id: string; nombre: string | null }
  }>
  pie?: { participa: boolean; tipoNee: 'transitoria' | 'permanente' | null } | null
  evaluaciones: ResultadoEvaluacionFicha[]
  semaforo: Semaforo | null
  alertas: unknown[]
}