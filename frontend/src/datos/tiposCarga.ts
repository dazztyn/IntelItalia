import type { FuenteCarga } from '../api/cargas'

export interface TipoCarga {
  id: string
  etiqueta: string
  descripcion: string
  /** null: el backend todavía no acepta esta fuente (la pestaña dice "Pronto"). */
  fuente: FuenteCarga | null
  /** Área que debe traer el archivo; el backend la detecta y aquí se compara. */
  area?: 'lenguaje' | 'matematica'
  /** Niveles en que se aplica: solo esos cursos tienen bloque. */
  niveles: string[]
  momentos?: Array<{ valor: string; etiqueta: string }>
}

const MOMENTOS_DIA = [
  { valor: 'diagnostico', etiqueta: 'Diagnóstico' },
  { valor: 'monitoreo', etiqueta: 'Monitoreo intermedio' },
  { valor: 'cierre', etiqueta: 'Cierre' },
]

// ⏳ Igual que en el backend (tipos-iniciales.ts): niveles del DIA a confirmar con la escuela.
const NIVELES_DIA = ['2', '3', '4', '5', '6', '7', '8']
const TODOS_LOS_NIVELES = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8']

export const TIPOS_CARGA: TipoCarga[] = [
  {
    id: 'dia-lectura',
    etiqueta: 'DIA Lectura',
    descripcion: 'Reporte .xlsx del DIA de cada curso, área Lectura.',
    fuente: 'dia',
    area: 'lenguaje',
    niveles: NIVELES_DIA,
    momentos: MOMENTOS_DIA,
  },
  {
    id: 'dia-matematica',
    etiqueta: 'DIA Matemática',
    descripcion: 'Reporte .xlsx del DIA de cada curso, área Matemática.',
    fuente: 'dia',
    area: 'matematica',
    niveles: NIVELES_DIA,
    momentos: MOMENTOS_DIA,
  },
  { id: 'letrapps', etiqueta: 'Letrapps', descripcion: 'Velocidad lectora.', fuente: null, niveles: TODOS_LOS_NIVELES },
  { id: 'sepa', etiqueta: 'SEPA', descripcion: 'Resultados de 2° básico.', fuente: null, niveles: ['2'] },
  { id: 'asistencia', etiqueta: 'Asistencia', descripcion: 'Exportación de Mi Aula.', fuente: null, niveles: TODOS_LOS_NIVELES },
  { id: 'notas', etiqueta: 'Notas', descripcion: 'Exportación de Mi Aula.', fuente: null, niveles: TODOS_LOS_NIVELES },
]

export const NOMBRE_AREA = { lenguaje: 'Lectura', matematica: 'Matemática' } as const