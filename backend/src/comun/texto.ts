// Normalización de nombres para identificar alumnos en fuentes que no traen RUT
// (Letrapps, DIA): sin tildes ni signos, en mayúsculas y con espacios simples.

/** "  José-Tomás  Pérez " → "JOSE TOMAS PEREZ". La Ñ se conserva. */
export function normalizarTexto(valor: string): string {
  return (
    valor
      .toUpperCase()
      .normalize('NFD')
      // Quita las tildes y la diéresis, pero conserva la virgulilla de la Ñ (U+0303).
      .replace(/[\u0300-\u0302\u0304-\u036f]/g, '')
      .normalize('NFC')
      .replace(/[^A-ZÑ0-9]+/g, ' ')
      .trim()
  );
}

/**
 * Clave de un nombre completo que no depende del orden de nombres y apellidos:
 * "Pérez Soto Ana María" y "Ana María Pérez Soto" dan la misma clave.
 */
export function claveNombre(
  ...partes: Array<string | null | undefined>
): string {
  const palabras = normalizarTexto(partes.filter(Boolean).join(' '))
    .split(' ')
    .filter(Boolean);
  return palabras.sort().join(' ');
}
