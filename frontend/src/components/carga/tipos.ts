import type { FilaVistaPrevia, ResultadoCarga, ResumenCarga } from '../../api/cargas'

export type EstadoArchivo =
  | { tipo: 'pendiente' }
  | { tipo: 'verificando'; archivo: File }
  | {
      tipo: 'listo'
      archivo: File
      filas: number
      dudosas: FilaVistaPrevia[]
      ocupados: string[]
      errores: number
      resoluciones: Record<string, string | null>
    }
  | { tipo: 'invalido'; archivo: File; mensaje: string }
  | { tipo: 'guardado'; resultado: ResumenCarga }
  | { tipo: 'previo'; carga: ResumenCarga }

export type EstadoPestana = 'completo' | 'pendiente'

export interface ResumenCurso {
  curso: string
  resultado?: ResultadoCarga
  error?: string
}

/** Filas dudosas que todavía no tienen una decisión (alumno o descartar). */
export function filasPorResolver(estado: Extract<EstadoArchivo, { tipo: 'listo' }>): number {
  return estado.dudosas.filter((fila) => !(String(fila.fila) in estado.resoluciones)).length
}