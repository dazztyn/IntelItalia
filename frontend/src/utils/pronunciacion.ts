// Ajustes de pronunciación: cómo debe decir la voz algunos textos de la app.
// Para agregar uno, suma un par [patrón, reemplazo] a REEMPLAZOS.

const ORDINALES: Record<string, string> = {
  '1': 'primero',
  '2': 'segundo',
  '3': 'tercero',
  '4': 'cuarto',
  '5': 'quinto',
  '6': 'sexto',
  '7': 'séptimo',
  '8': 'octavo',
}

type Reemplazo = string | ((coincidencia: string, ...grupos: string[]) => string)

const REEMPLAZOS: Array<[RegExp, Reemplazo]> = [
  // "2° Básico" → "segundo Básico"; "1° a 8°" → "primero a octavo".
  [/\b([1-8])\s?°/g, (_coincidencia, numero) => ORDINALES[numero]],
  // "N° de lista" → "número de lista".
  [/\bN°\s?/g, 'número '],
  // El separador "·" que usa la app se lee como una pausa.
  [/\s·\s/g, ', '],
]

export function paraVoz(texto: string): string {
  return REEMPLAZOS.reduce(
    (resultado, [patron, reemplazo]) =>
      typeof reemplazo === 'string'
        ? resultado.replace(patron, reemplazo)
        : resultado.replace(patron, reemplazo),
    texto,
  )
}