// RUT chileno: se guarda normalizado como "12345678-5" (sin puntos, DV en mayúscula)
// y se valida con el algoritmo módulo 11.

const FORMATO_RUT = /^(\d{1,8})-([\dK])$/;

/** Quita puntos y espacios, pasa el DV a mayúscula y agrega el guion si falta. */
export function normalizarRut(valor: string): string {
  const limpio = valor.replace(/[.\s]/g, '').toUpperCase();
  if (limpio.includes('-')) {
    const [cuerpo, dv] = limpio.split('-');
    return `${cuerpo.replace(/^0+/, '')}-${dv}`;
  }
  return `${limpio.slice(0, -1).replace(/^0+/, '')}-${limpio.slice(-1)}`;
}

/** Dígito verificador (0-9 o K) de un cuerpo de RUT, con módulo 11. */
export function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (const digito of cuerpo.split('').reverse()) {
    suma += Number(digito) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/** true si el RUT (normalizado o no) tiene formato válido y su DV es correcto. */
export function esRutValido(valor: string): boolean {
  const coincidencia = FORMATO_RUT.exec(normalizarRut(valor));
  if (!coincidencia) return false;
  const [, cuerpo, dv] = coincidencia;
  return Number(cuerpo) > 0 && calcularDigitoVerificador(cuerpo) === dv;
}
