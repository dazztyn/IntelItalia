import { useLectorVoz } from '../hooks/useLectorVoz'
import { segmentosDe } from '../utils/textoLegible'

export function ControlLectura() {
  const { soportado, disponible, buscandoVoz, hablando, velocidad, cambiarVelocidad, leer, detener } =
    useLectorVoz()

  if (!soportado) return null

  function alternar() {
    if (hablando) {
      detener()
      return
    }
    const seleccion = window.getSelection()?.toString().trim()
    if (seleccion) {
      leer([{ texto: seleccion, elemento: null }])
      return
    }
    const principal = document.querySelector('main')
    if (principal) leer(segmentosDe(principal))
  }

  const ayuda =
    !disponible && !buscandoVoz
      ? 'No hay una voz en español instalada en este equipo'
      : hablando
        ? 'Detener la lectura'
        : 'Leer en voz alta la página o el texto seleccionado'

  return (
    <div
      data-no-leer
      className="fixed bottom-28 right-4 z-40 flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
    >
      <button
        type="button"
        onMouseDown={(evento) => evento.preventDefault()}
        onClick={alternar}
        disabled={!disponible}
        aria-pressed={hablando}
        title={ayuda}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          hablando
            ? 'bg-italia-verde text-white'
            : 'text-tinta hover:bg-italia-verde/10 dark:text-italia-blanco'
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d="M10 3.5a.75.75 0 0 0-1.2-.6L5.2 5.75H3a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h2.2l3.6 2.85A.75.75 0 0 0 10 16.5v-13Z" />
          <path d="M13.5 6.6a.75.75 0 0 1 1.06 0 4.75 4.75 0 0 1 0 6.8.75.75 0 1 1-1.06-1.06 3.25 3.25 0 0 0 0-4.68.75.75 0 0 1 0-1.06Z" />
        </svg>
        {hablando ? 'Detener' : 'Escuchar'}
      </button>

      <button
        type="button"
        onClick={cambiarVelocidad}
        disabled={!disponible}
        aria-label={`Velocidad de lectura: ${velocidad.toLocaleString('es-CL')} veces. Cambiar`}
        title="Cambiar velocidad"
        className="rounded-full px-2.5 py-1.5 text-xs font-semibold tabular-nums text-tinta transition-colors hover:bg-italia-verde/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-italia-blanco"
      >
        {velocidad.toLocaleString('es-CL')}×
      </button>
    </div>
  )
}