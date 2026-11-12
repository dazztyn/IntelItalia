export interface Segmento {
  texto: string
  /** Elemento que se resalta mientras se lee; null para un texto seleccionado. */
  elemento: HTMLElement | null
}

const BLOQUES =
  'h1, h2, h3, h4, h5, h6, p, li, th, td, dt, dd, label, legend, caption, figcaption, button, a, summary'

// Nunca se lee: lo oculto, lo marcado con data-no-leer, y los <select> (leería todas las opciones).
const OMITIR = '[inert], [aria-hidden="true"], [hidden], [data-no-leer], select, script, style, svg'
const OCULTO = '[inert], [aria-hidden="true"], [hidden], [data-no-leer]'

export function segmentosDe(raiz: HTMLElement): Segmento[] {
  const textosPorBloque = new Map<HTMLElement, string[]>()
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)

  for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
    const texto = nodo.textContent?.trim()
    const padre = nodo.parentElement
    if (!texto || !padre || padre.closest(OMITIR)) continue
    if (padre.checkVisibility && !padre.checkVisibility()) continue

    const bloque = padre.closest<HTMLElement>(BLOQUES)
    const destino = bloque && raiz.contains(bloque) ? bloque : padre
    const textos = textosPorBloque.get(destino) ?? []
    textos.push(texto)
    textosPorBloque.set(destino, textos)
  }

  return [...textosPorBloque].map(([elemento, textos]) => ({
    elemento,
    texto: textos.join(' ').replace(/\s+/g, ' '),
  }))
}

function textoPropio(elemento: Element): string {
  return [...elemento.childNodes]
    .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
    .map((nodo) => nodo.textContent ?? '')
    .join(' ')
    .trim()
}

export function segmentosDeObjetivo(objetivo: Element): Segmento[] {
  if (objetivo.closest(OCULTO)) return []

  if (objetivo instanceof HTMLSelectElement) {
    const etiqueta = objetivo.labels?.[0] ? textoPropio(objetivo.labels[0]) : (objetivo.getAttribute('aria-label') ?? '')
    const elegida = objetivo.selectedOptions[0]?.text ?? ''
    return [{ texto: `${etiqueta} ${elegida}`.trim(), elemento: objetivo }]
  }

  const bloque = objetivo.closest<HTMLElement>(`${BLOQUES}, tr, [role="img"]`)
  if (!bloque) return []

  const segmentos = segmentosDe(bloque)
  if (segmentos.length > 0) return segmentos

  const nombre = bloque.getAttribute('aria-label') ?? bloque.getAttribute('title')
  return nombre ? [{ texto: nombre, elemento: bloque }] : []
}