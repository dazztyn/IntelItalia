export type EstadoFila =
  'encontrado' | 'ambiguo' | 'noEncontrado' | 'sinResultado' | 'error';

export interface FilaVistaPrevia {
  fila: number;
  numeroLista: number | null;
  nombre: string;
  estado: EstadoFila;
  alumnoId: string | null;
  candidatos: Array<{ id: string; nombreCompleto: string }>;
  /** `true` si se identificó por lo que alguien resolvió en una carga anterior. */
  porAlias?: boolean;
  /** Resultado como se va a guardar; su forma depende de la fuente. */
  resultados: Record<string, unknown> | null;
  /** @deprecated Solo DIA: usar `resultados.porcentajesPorEje`. */
  porcentajesPorEje: Record<string, number> | null;
  /** @deprecated Solo DIA: usar `resultados.porcentajeLogro`. */
  porcentajeLogro: number | null;
  mensaje?: string;
}

/** Lo que cada estrategia aporta a una fila de la vista previa. */
export type DatosFilaVistaPrevia = Pick<
  FilaVistaPrevia,
  'resultados' | 'porcentajesPorEje' | 'porcentajeLogro'
>;

export interface VistaPrevia {
  curso: { id: string; nombre: string };
  anio: number;
  area: 'lenguaje' | 'matematica';
  momento: string;
  ejes: string[];
  filas: FilaVistaPrevia[];
}
