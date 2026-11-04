import { pedir } from './cliente'

export type FuenteCarga = 'dia'

export type EstadoFila = 'encontrado' | 'ambiguo' | 'noEncontrado' | 'sinResultado' | 'error'

export interface FilaVistaPrevia {
  fila: number
  numeroLista: number | null
  nombre: string
  estado: EstadoFila
  alumnoId: string | null
  candidatos: Array<{ id: string; nombreCompleto: string }>
  porcentajesPorEje: Record<string, number> | null
  porcentajeLogro: number | null
  mensaje?: string
}

export interface VistaPrevia {
  curso: { id: string; nombre: string }
  anio: number
  area: 'lenguaje' | 'matematica'
  momento: string
  ejes: string[]
  filas: FilaVistaPrevia[]
}

export interface ResultadoCarga {
  id: string
  fuente: FuenteCarga
  nombreArchivo: string
  cursoId: string
  anio: number
  momento: string
  area: string
  estado: 'completada' | 'completadaConErrores' | 'fallida'
  filasTotales: number
  filasOk: number
  iniciadaEn: string
  finalizadaEn: string
  errores: Array<{ fila: number; campo: string; mensaje: string }>
}

function formulario(archivo: File, fuente: FuenteCarga, momento: string): FormData {
  const datos = new FormData()
  datos.append('archivo', archivo)
  datos.append('fuente', fuente)
  datos.append('momento', momento)
  return datos
}

export function previsualizarCarga(archivo: File, fuente: FuenteCarga, momento: string) {
  return pedir<VistaPrevia>('/cargas/vista-previa', {
    method: 'POST',
    body: formulario(archivo, fuente, momento),
  })
}


export function confirmarCarga(archivo: File, fuente: FuenteCarga, momento: string) {
  return pedir<ResultadoCarga>('/cargas', {
    method: 'POST',
    body: formulario(archivo, fuente, momento),
  })
}