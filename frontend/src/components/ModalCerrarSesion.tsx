import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSesion } from '../hooks/useSession'
import { useTeclaEscape } from '../hooks/useEscape'

interface Props {
  abierto: boolean
  alCerrar: () => void
}

export function ModalCerrarSesion({ abierto, alCerrar }: Props) {
  const { cerrarSesion } = useSesion()
  const [saliendo, setSaliendo] = useState(false)
  useTeclaEscape(abierto && !saliendo, alCerrar)

  if (!abierto) return null

  async function confirmar() {
    setSaliendo(true)
    try {
      await cerrarSesion()
    } finally {
      setSaliendo(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={saliendo ? undefined : alCerrar}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-salida"
        aria-describedby="texto-salida"
        className="relative w-full max-w-sm rounded-xl bg-italia-rojo p-6 text-white shadow-2xl transition duration-200 starting:scale-95 starting:opacity-0"
      >
        <h2 id="titulo-salida" className="text-xl font-semibold">
          Cerrar sesión
        </h2>
        <p id="texto-salida" className="mt-2 text-white/90">
          Está abandonando el sitio. ¿Desea confirmar?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={alCerrar}
            disabled={saliendo}
            className="rounded-md border border-white/70 px-4 py-2 font-medium transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saliendo}
            className="rounded-md bg-white px-4 py-2 font-semibold text-italia-rojo transition-colors hover:bg-italia-blanco disabled:opacity-60"
          >
            {saliendo ? 'Saliendo…' : 'Sí, salir'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}