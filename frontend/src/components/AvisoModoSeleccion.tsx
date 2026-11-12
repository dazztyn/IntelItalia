import { createPortal } from 'react-dom'

interface Props {
  visible: boolean
  mensaje: string
  alAceptar: () => void
}
export function AvisoModoSeleccion({ visible, mensaje, alAceptar }: Props) {
  if (!visible) return null

  return createPortal(
    <div data-no-leer className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={alAceptar}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-aviso-seleccion"
        aria-describedby="texto-aviso-seleccion"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white text-tinta shadow-2xl transition duration-200 starting:scale-95 starting:opacity-0 dark:bg-noche dark:text-italia-blanco"
      >
        <div aria-hidden="true" className="h-2 bg-linear-to-r from-verde-fondo to-green-900" />
        <div className="p-6 md:p-8">
          <h2 id="titulo-aviso-seleccion" className="text-3xl font-bold">
            Atención
          </h2>
          <p id="texto-aviso-seleccion" className="mt-4 text-xl leading-relaxed">
            {mensaje}
          </p>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={alAceptar}
              className="rounded-lg bg-verde-texto px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-texto dark:bg-emerald-400 dark:text-noche dark:hover:bg-emerald-300"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}