import { useEffect, useState } from 'react'
import { useLectorVoz, VELOCIDAD_MAXIMA, VELOCIDAD_MINIMA } from '../hooks/useLectorVoz'
import { useTeclaEscape } from '../hooks/useEscape'
import { segmentosDe, segmentosDeObjetivo } from '../utils/textoLegible'
import { AvisoModoSeleccion } from './AvisoModoSeleccion'

const MENSAJE_MODO_SELECCION =
  'Va a entrar al modo de selección de lectura en voz alta. Podrá elegir qué leer, y se leerá al hacer clic, pero no podrá interactuar con los botones hasta salir de este modo. Para salir, presione Escape o vuelva a hacer clic en «Modo de selección». Para continuar, presione Aceptar.'

const OPCION =
  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const OPCION_INACTIVA =
  'border-tinta/15 bg-white text-tinta hover:bg-italia-verde/10 dark:border-white/15 dark:bg-noche dark:text-italia-blanco dark:hover:bg-white/10'
const OPCION_ACTIVA = 'border-transparent bg-verde-texto text-white dark:bg-emerald-400 dark:text-noche'

function IconoVoz() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path d="M10 3.5a.75.75 0 0 0-1.2-.6L5.2 5.75H3a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h2.2l3.6 2.85A.75.75 0 0 0 10 16.5v-13Z" />
      <path d="M13.5 6.6a.75.75 0 0 1 1.06 0 4.75 4.75 0 0 1 0 6.8.75.75 0 1 1-1.06-1.06 3.25 3.25 0 0 0 0-4.68.75.75 0 0 1 0-1.06Z" />
    </svg>
  )
}

function IconoDetener() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 shrink-0">
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function IconoCursor() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path d="M4.3 2.3a.75.75 0 0 1 .8-.15l11 4.5a.75.75 0 0 1-.07 1.41l-4.4 1.37 3.1 3.1a.75.75 0 0 1 0 1.06l-1.6 1.6a.75.75 0 0 1-1.06 0l-3.1-3.1-1.37 4.4a.75.75 0 0 1-1.41.07l-4.5-11a.75.75 0 0 1 .15-.8Z" />
    </svg>
  )
}

function IconoCruz() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
    </svg>
  )
}

export function ControlLectura() {
  const { soportado, disponible, buscandoVoz, hablando, velocidad, fijarVelocidad, leer, detener } =
    useLectorVoz()
  const [abierto, setAbierto] = useState(false)
  const [seleccionando, setSeleccionando] = useState(false)
  const [avisoVisible, setAvisoVisible] = useState(false)

  const cerrarMenu = () => {
    setAbierto(false)
    setSeleccionando(false)
    setAvisoVisible(false)
    detener()
  }
  useTeclaEscape(abierto && !seleccionando, cerrarMenu)

  useEffect(() => {
    if (!seleccionando) return
    const raiz = document.documentElement
    raiz.classList.add('modo-senalar')

    function alHacerClic(evento: MouseEvent) {
      const objetivo = evento.target
      if (!(objetivo instanceof Element) || objetivo.closest('[data-no-leer]')) return
      evento.preventDefault()
      evento.stopPropagation()
      leer(segmentosDeObjetivo(objetivo))
    }

    function alEnfocar(evento: FocusEvent) {
      const objetivo = evento.target
      if (
        !(objetivo instanceof Element) ||
        !objetivo.matches(':focus-visible') ||
        objetivo.closest('[data-no-leer]')
      ) {
        return
      }
      leer(segmentosDeObjetivo(objetivo))
    }

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setSeleccionando(false)
        setAvisoVisible(false)
      }
    }

    document.addEventListener('click', alHacerClic, true)
    document.addEventListener('focusin', alEnfocar)
    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      raiz.classList.remove('modo-senalar')
      document.removeEventListener('click', alHacerClic, true)
      document.removeEventListener('focusin', alEnfocar)
      document.removeEventListener('keydown', alPresionarTecla)
    }
  }, [seleccionando, leer])

  if (!soportado) return null

  function leerPagina() {
    if (hablando) {
      detener()
      return
    }
    const principal = document.querySelector('main')
    if (principal) leer(segmentosDe(principal))
  }

  function alternarSeleccion() {
    if (seleccionando) {
      setSeleccionando(false)
      setAvisoVisible(false)
      detener()
      return
    }
    setSeleccionando(true)
    setAvisoVisible(true)
    leer([{ texto: `Atención. ${MENSAJE_MODO_SELECCION}`, elemento: null }])
  }

  function aceptarAviso() {
    setAvisoVisible(false)
    detener()
  }

  const sinVoz = !disponible && !buscandoVoz
  const velocidadTexto = velocidad.toLocaleString('es-CL')

  return (
    <div data-no-leer className="fixed bottom-28 right-4 z-40 flex flex-col items-end gap-2">
      {abierto && (
        <div
          id="menu-lectura"
          role="group"
          aria-label="Opciones de lectura en voz alta"
          className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-tinta/15 bg-white p-4 text-tinta shadow-xl transition duration-200 starting:translate-y-2 starting:opacity-0 dark:border-white/15 dark:bg-noche dark:text-italia-blanco"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Lectura en voz alta</h2>
            <button
              type="button"
              onClick={cerrarMenu}
              aria-label="Cerrar opciones de lectura"
              className="rounded-md p-1.5 transition-colors hover:bg-tinta/10 dark:hover:bg-white/10"
            >
              <IconoCruz />
            </button>
          </div>

          {sinVoz && (
            <p className="mb-3 rounded-md bg-amber-300 px-3 py-2 text-sm text-amber-950">
              No hay una voz en español instalada en este equipo. Puedes agregarla en Configuración →
              Hora e idioma → Voz.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={leerPagina}
              disabled={!disponible}
              className={`${OPCION} ${OPCION_INACTIVA}`}
            >
              {hablando ? <IconoDetener /> : <IconoVoz />}
              {hablando ? 'Detener lectura' : 'Leer página completa'}
            </button>

            <button
              type="button"
              onClick={alternarSeleccion}
              disabled={!disponible}
              aria-pressed={seleccionando}
              className={`${OPCION} ${seleccionando ? OPCION_ACTIVA : OPCION_INACTIVA}`}
            >
              {seleccionando ? <IconoCruz /> : <IconoCursor />}
              Modo de selección
            </button>
          </div>

          <div className="mt-4 border-t border-tinta/10 pt-4 dark:border-white/10">
            <label className="block text-sm font-semibold">
              <span className="flex justify-between">
                <span>Velocidad</span>
                <span className="tabular-nums">{velocidadTexto}×</span>
              </span>
              <input
                type="range"
                min={VELOCIDAD_MINIMA}
                max={VELOCIDAD_MAXIMA}
                step={0.25}
                value={velocidad}
                onChange={(evento) => fijarVelocidad(Number(evento.target.value))}
                disabled={!disponible}
                aria-valuetext={`${velocidadTexto} veces`}
                className="mt-2 w-full accent-verde-texto disabled:opacity-50 dark:accent-emerald-400"
              />
              <span aria-hidden="true" className="mt-1 flex justify-between text-xs font-normal text-secundario">
                <span>Lenta</span>
                <span>Rápida</span>
              </span>
            </label>
            <p className="mt-2 text-xs text-secundario">El cambio se aplica al empezar a leer.</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => (abierto ? cerrarMenu() : setAbierto(true))}
        aria-expanded={abierto}
        aria-controls="menu-lectura"
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg hover:border-green-600 hover:bg-green-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-green-400 dark:hover:bg-slate-600"
      >
        <IconoVoz />
        Lectura en voz alta
      </button>
      <AvisoModoSeleccion
        visible={seleccionando && avisoVisible}
        mensaje={MENSAJE_MODO_SELECCION}
        alAceptar={aceptarAviso}
      />
      
    </div>
  )
}