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

/** Como responde GET /api/cargas: la carga sin el detalle de errores. */
export type ResumenCarga = Omit<ResultadoCarga, 'errores'>

// shortcut: el backend devuelve solo las últimas 50 cargas (alcanza para un año del DIA: 7 cursos × 2 áreas × 3 momentos); filtrar por año y fuente en la API cuando haya más.
export function listarCargas(): Promise<ResumenCarga[]> {
  return pedir<ResumenCarga[]>('/cargas')
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

/** `resoluciones`: `{ "<fila>": alumnoId | null }` para las filas dudosas; `null` la descarta. */
export function confirmarCarga(
  archivo: File,
  fuente: FuenteCarga,
  momento: string,
  resoluciones: Record<string, string | null> = {},
) {
  const datos = formulario(archivo, fuente, momento)
  datos.append('resoluciones', JSON.stringify(resoluciones))
  return pedir<ResultadoCarga>('/cargas', { method: 'POST', body: datos })
}