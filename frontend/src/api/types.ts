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