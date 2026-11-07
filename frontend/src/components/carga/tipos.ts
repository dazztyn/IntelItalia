import type { FilaVistaPrevia, ResultadoCarga, ResumenCarga } from '../../api/cargas'

export type EstadoArchivo =
  | { tipo: 'pendiente' }
  | { tipo: 'verificando'; archivo: File }
  | {
      tipo: 'listo'
      archivo: File
      filas: number
      /** Filas `ambiguo` o `noEncontrado`: el usuario elige al alumno o las descarta. */
      dudosas: FilaVistaPrevia[]
      /** Alumnos ya identificados en el archivo: no se ofrecen de nuevo (el backend rechaza repetidos). */
      ocupados: string[]
      /** Filas con porcentajes inválidos: no se pueden resolver y no se guardan. */
      errores: number
      /** `{ "<fila>": alumnoId | null }`, como lo recibe POST /api/cargas. */
      resoluciones: Record<string, string | null>
    }
  | { tipo: 'invalido'; archivo: File; mensaje: string }
  | { tipo: 'guardado'; resultado: ResumenCarga }

export interface ResumenCurso {
  curso: string
  resultado?: ResultadoCarga
  error?: string
}

/** Filas dudosas que todavía no tienen una decisión (alumno o descartar). */
export function filasPorResolver(estado: Extract<EstadoArchivo, { tipo: 'listo' }>): number {
  return estado.dudosas.filter((fila) => !(String(fila.fila) in estado.resoluciones)).length
}
