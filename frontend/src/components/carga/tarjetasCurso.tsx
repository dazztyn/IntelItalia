import type { Curso } from '../../api/types'
import type { EstadoArchivo } from './tipos'

interface Props {
  curso: Curso
  estado: EstadoArchivo
  deshabilitada: boolean
  alElegirArchivo: (archivo: File) => void
}

interface Apariencia {
  etiqueta: string
  barra: string
  insignia: string
  flecha: string
  detalle: string
}

function apariencia(estado: EstadoArchivo): Apariencia {
  switch (estado.tipo) {
    case 'pendiente':
      return {
        etiqueta: 'Pendiente',
        barra: 'border-t-amber-400',
        insignia: 'bg-amber-100 text-amber-800',
        flecha: 'text-amber-500',
        detalle: 'Sin archivo',
      }
    case 'verificando':
      return {
        etiqueta: 'Revisando…',
        barra: 'border-t-slate-300',
        insignia: 'bg-slate-100 text-slate-700',
        flecha: 'text-slate-400',
        detalle: estado.archivo.name,
      }
    case 'listo':
      return {
        etiqueta: 'Listo',
        barra: 'border-t-emerald-500',
        insignia: 'bg-emerald-100 text-emerald-800',
        flecha: 'text-emerald-600',
        detalle:
          `${estado.filas} filas` +
          (estado.porRevisar > 0 ? ` · ${estado.porRevisar} no se podrán guardar` : ''),
      }
    case 'invalido':
      return {
        etiqueta: 'Revisar archivo',
        barra: 'border-t-red-500',
        insignia: 'bg-red-100 text-red-800',
        flecha: 'text-red-600',
        detalle: estado.mensaje,
      }
    case 'guardado': {
      const { estado: resultado, filasOk, filasTotales } = estado.resultado
      const detalle = `${filasOk} de ${filasTotales} filas guardadas`
      if (resultado === 'completada') {
        return { etiqueta: 'Guardado', barra: 'border-t-emerald-500', insignia: 'bg-emerald-100 text-emerald-800', flecha: 'text-emerald-600', detalle }
      }
      if (resultado === 'completadaConErrores') {
        return { etiqueta: 'Guardado con errores', barra: 'border-t-amber-400', insignia: 'bg-amber-100 text-amber-800', flecha: 'text-amber-500', detalle }
      }
      return { etiqueta: 'No se guardó', barra: 'border-t-red-500', insignia: 'bg-red-100 text-red-800', flecha: 'text-red-600', detalle }
    }
  }
}

export function TarjetaCurso({ curso, estado, deshabilitada, alElegirArchivo }: Props) {
  const vista = apariencia(estado)
  const bloqueada = deshabilitada || estado.tipo === 'verificando'

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-t-4 border-tinta/10 bg-italia-blanco p-4 transition-colors dark:border-white/10 dark:bg-white/5 ${vista.barra}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{curso.nombre}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${vista.insignia}`}>
          {vista.etiqueta}
        </span>
      </div>

      <p className="min-h-10 text-sm text-tinta/60 dark:text-italia-blanco/60">{vista.detalle}</p>

      <label
        className={`inline-flex items-center justify-center gap-2 self-end rounded-md border border-tinta/10 bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-italia-verde dark:bg-noche dark:text-italia-blanco ${
          bloqueada ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:shadow-md'
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`h-4 w-4 ${vista.flecha}`}>
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.4 1.4L11 6.4V16a1 1 0 1 1-2 0V6.4L6.7 8.7a1 1 0 0 1-1.4-1.4l4-4A1 1 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
        {estado.tipo === 'pendiente' ? 'Subir' : 'Cambiar'}
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          disabled={bloqueada}
          aria-label={`Archivo de ${curso.nombre}`}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0]
            if (archivo) alElegirArchivo(archivo)
            // Permite volver a elegir el mismo archivo después de corregirlo.
            evento.target.value = ''
          }}
        />
      </label>
    </div>
  )
}