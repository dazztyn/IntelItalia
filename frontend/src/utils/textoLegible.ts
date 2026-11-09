export interface Segmento {
  texto: string
  elemento: HTMLElement | null
}

const BLOQUES =
  'h1, h2, h3, h4, h5, h6, p, li, th, td, dt, dd, label, legend, caption, figcaption, button, a, summary'
const OMITIR = '[inert], [aria-hidden="true"], [hidden], [data-no-leer], select, script, style, svg'

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