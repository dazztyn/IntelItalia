// Niveles que atiende la escuela: pre-kínder, kínder y 1° a 8° básico.
export const NIVELES = [
  'PK',
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
] as const;
export type Nivel = (typeof NIVELES)[number];

/** PK y K se evalúan con conceptos; 1° a 8°, con notas de 1.0 a 7.0. */
export function esNivelParvulario(nivel: Nivel): boolean {
  return nivel === 'PK' || nivel === 'K';
}

/** Nombre visible del curso: "Pre-kínder", "3° Básico" o, con letra, "3° Básico A". */
export function nombreCurso(nivel: Nivel, letra: string | null = null): string {
  const base =
    nivel === 'PK'
      ? 'Pre-kínder'
      : nivel === 'K'
        ? 'Kínder'
        : `${nivel}° Básico`;
  return letra ? `${base} ${letra}` : base;
}
