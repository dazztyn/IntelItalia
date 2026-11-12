import { createPortal } from 'react-dom'
import { useTeclaEscape } from '../../hooks/useEscape'
import type { ResumenCurso } from './tipos'

interface Props {
  resumen: ResumenCurso[] | null
  alCerrar: () => void
}

const MAXIMO_ERRORES_POR_CURSO = 5

export function ModalResultadoCarga({ resumen, alCerrar }: Props) {
  useTeclaEscape(resumen !== null, alCerrar)
  if (!resumen) return null

  const exito = resumen.every((item) => item.resultado?.estado === 'completada')

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={alCerrar}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-resultado"
        className={`relative w-full max-w-lg rounded-xl p-6 text-white shadow-2xl transition duration-200 starting:scale-95 starting:opacity-0 ${
          exito ? 'bg-linear-to-br from-verde-fondo to-green-900' : 'bg-italia-rojo'
        }`}
      >
        <h2 id="titulo-resultado" className="text-xl font-semibold">
          {exito ? 'Procesado exitosamente' : 'Carga con errores, revise los archivos'}
        </h2>

        <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
          {resumen.map((item) => (
            <li key={item.curso} className="rounded-md bg-white/10 px-3 py-2">
              <p className="font-semibold">{item.curso}</p>
              {item.error ? (
                <p className="text-white/90">{item.error}</p>
              ) : item.resultado ? (
                <>
                  <p className="text-white/90">
                    {item.resultado.filasOk} de {item.resultado.filasTotales} filas guardadas
                  </p>
                  {item.resultado.errores.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-white/90">
                      {item.resultado.errores.slice(0, MAXIMO_ERRORES_POR_CURSO).map((error) => (
                        <li key={`${error.fila}-${error.campo}`}>
                          Fila {error.fila}: {error.mensaje}
                        </li>
                      ))}
                      {item.resultado.errores.length > MAXIMO_ERRORES_POR_CURSO && (
                        <li>
                          y {item.resultado.errores.length - MAXIMO_ERRORES_POR_CURSO} errores más
                        </li>
                      )}
                    </ul>
                  )}
                </>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={alCerrar}
            className={`rounded-md bg-white px-4 py-2 font-semibold transition-colors hover:bg-italia-blanco ${
              exito ? 'text-verde-texto' : 'text-italia-rojo'
            }`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}