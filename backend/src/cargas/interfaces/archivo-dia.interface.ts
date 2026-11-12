import { Nivel } from '../../cursos/niveles';

export interface FilaDia {
  fila: number;
  numeroLista: number | null;
  nombre: string;
  porcentajesPorEje: Record<string, number> | null;
  porcentajeLogro: number | null;
  error?: string;
}

export interface ArchivoDia {
  nivel: Nivel;
  letra: string | null;
  anio: number;
  area: 'lenguaje' | 'matematica';
  ejes: string[];
  filas: FilaDia[];
}
