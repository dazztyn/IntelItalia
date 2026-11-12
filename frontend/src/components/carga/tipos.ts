import type { ResultadoCarga, ResumenCarga } from '../../api/cargas'

export type EstadoArchivo =
  | { tipo: 'pendiente' }
  | { tipo: 'verificando'; archivo: File }
  | { tipo: 'listo'; archivo: File; filas: number; porRevisar: number }
  | { tipo: 'invalido'; archivo: File; mensaje: string }
  | { tipo: 'guardado'; resultado: ResultadoCarga }
  | { tipo: 'previo'; carga: ResumenCarga }

export type EstadoPestana = 'completo' | 'pendiente'

export interface ResumenCurso {
  curso: string
  resultado?: ResultadoCarga
  error?: string
}