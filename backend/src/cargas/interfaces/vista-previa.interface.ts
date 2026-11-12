export type EstadoFila =
  'encontrado' | 'ambiguo' | 'noEncontrado' | 'sinResultado' | 'error';

export interface FilaVistaPrevia {
  fila: number;
  numeroLista: number | null;
  nombre: string;
  estado: EstadoFila;
  alumnoId: string | null;
  candidatos: Array<{ id: string; nombreCompleto: string }>;
  porcentajesPorEje: Record<string, number> | null;
  porcentajeLogro: number | null;
  mensaje?: string;
}

export interface VistaPrevia {
  curso: { id: string; nombre: string };
  anio: number;
  area: 'lenguaje' | 'matematica';
  momento: string;
  ejes: string[];
  filas: FilaVistaPrevia[];
}
