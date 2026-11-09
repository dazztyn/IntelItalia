import { useCallback, useEffect, useRef, useState } from 'react'
import type { Segmento } from '../utils/textoLegible'

const SOPORTADO = typeof window !== 'undefined' && 'speechSynthesis' in window
const VELOCIDADES = [1, 1.25, 1.5, 0.75]
const CLAVE_VELOCIDAD = 'velocidadLectura'
const LARGO_MAXIMO = 180

function elegirVoz(): SpeechSynthesisVoice | null {
  if (!SOPORTADO) return null

  const idioma = (voz: SpeechSynthesisVoice) => voz.lang.toLowerCase().replace('_', '-')
  const locales = window.speechSynthesis
    .getVoices()
    .filter((voz) => voz.localService && idioma(voz).startsWith('es'))

  for (const preferido of ['es-cl', 'es-419', 'es-us', 'es-mx']) {
    const voz = locales.find((v) => idioma(v) === preferido)
    if (voz) return voz
  }
  return locales[0] ?? null
}

function leerVelocidadGuardada(): number {
  try {
    const guardada = Number(localStorage.getItem(CLAVE_VELOCIDAD))
    return VELOCIDADES.includes(guardada) ? guardada : 1
  } catch {
    return 1
  }
}

function guardarVelocidad(velocidad: number): boolean {
  try {
    localStorage.setItem(CLAVE_VELOCIDAD, String(velocidad))
    return true
  } catch {
    return false
  }
}
function partir(texto: string): string[] {
  const trozos: string[] = []
  for (const frase of texto.split(/(?<=[.!?;:])\s+/)) {
    if (frase.length <= LARGO_MAXIMO) {
      trozos.push(frase)
      continue
    }
    let actual = ''
    for (const palabra of frase.split(' ')) {
      if (actual && actual.length + palabra.length + 1 > LARGO_MAXIMO) {
        trozos.push(actual)
        actual = palabra
      } else {
        actual = actual ? `${actual} ${palabra}` : palabra
      }
    }
    if (actual) trozos.push(actual)
  }
  return trozos.filter(Boolean)
}

export function useLectorVoz() {
  const [voz, setVoz] = useState(elegirVoz)
  const [buscandoVoz, setBuscandoVoz] = useState(
    () => SOPORTADO && window.speechSynthesis.getVoices().length === 0,
  )
  const [hablando, setHablando] = useState(false)
  const [velocidad, setVelocidad] = useState(leerVelocidadGuardada)
  const marcado = useRef<HTMLElement | null>(null)
  const lectura = useRef(0)

  const quitarMarca = useCallback(() => {
    marcado.current?.removeAttribute('data-leyendo')
    marcado.current = null
  }, [])

  useEffect(() => {
    if (!SOPORTADO) return
    const sintesis = window.speechSynthesis

    function alCambiarVoces() {
      setVoz(elegirVoz())
      setBuscandoVoz(false)
    }
    sintesis.addEventListener('voiceschanged', alCambiarVoces)
    const espera = setTimeout(() => setBuscandoVoz(false), 2000)

    return () => {
      sintesis.removeEventListener('voiceschanged', alCambiarVoces)
      clearTimeout(espera)
      lectura.current++
      sintesis.cancel()
      quitarMarca()
    }
  }, [quitarMarca])

  const detener = useCallback(() => {
    if (!SOPORTADO) return
    lectura.current++
    window.speechSynthesis.cancel()
    quitarMarca()
    setHablando(false)
  }, [quitarMarca])

  const leer = useCallback(
    (segmentos: Segmento[]) => {
      if (!SOPORTADO || !voz || segmentos.length === 0) return
      const sintesis = window.speechSynthesis
      sintesis.cancel()
      quitarMarca()

      const id = ++lectura.current
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const frases = segmentos.flatMap((segmento) =>
        partir(segmento.texto).map((texto) => ({ texto, elemento: segmento.elemento })),
      )

      frases.forEach(({ texto, elemento }, indice) => {
        const frase = new SpeechSynthesisUtterance(texto)
        frase.voice = voz
        frase.lang = voz.lang
        frase.rate = velocidad

        frase.onstart = () => {
          if (id !== lectura.current || elemento === marcado.current) return
          quitarMarca()
          if (elemento) {
            elemento.setAttribute('data-leyendo', '')
            elemento.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' })
            marcado.current = elemento
          }
        }
        if (indice === frases.length - 1) {
          frase.onend = () => {
            if (id !== lectura.current) return
            quitarMarca()
            setHablando(false)
          }
        }
        frase.onerror = (evento) => {
          if (id !== lectura.current || evento.error === 'interrupted' || evento.error === 'canceled') {
            return
          }
          quitarMarca()
          setHablando(false)
        }

        sintesis.speak(frase)
      })

      setHablando(true)
    },
    [voz, velocidad, quitarMarca],
  )

  function cambiarVelocidad() {
    const siguiente = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length]
    setVelocidad(siguiente)
    guardarVelocidad(siguiente)
  }

  return {
    soportado: SOPORTADO,
    disponible: voz !== null,
    buscandoVoz,
    hablando,
    velocidad,
    cambiarVelocidad,
    leer,
    detener,
  }
}