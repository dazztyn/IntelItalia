import type { Semaforo } from '../api/types'

export const SEMAFOROS: Record<Semaforo, { etiqueta: string; insignia: string; barra: string }> = {
  verde: {
    etiqueta: 'Sin alertas',
    insignia: 'bg-emerald-700 text-white dark:bg-emerald-900/60 dark:text-emerald-200',
    barra: 'bg-emerald-500',
  },
  amarillo: {
    etiqueta: 'Atención',
    insignia: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    barra: 'bg-yellow-400',
  },
  naranjo: {
    etiqueta: 'Alerta alta',
    insignia: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    barra: 'bg-orange-500',
  },
  rojo: {
    etiqueta: 'Crítico',
    insignia: 'bg-red-700 text-white dark:bg-red-900/50 dark:text-red-200',
    barra: 'bg-red-600',
  },
}

export const ORDEN_SEMAFORO: Semaforo[] = ['verde', 'amarillo', 'naranjo', 'rojo']