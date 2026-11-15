export interface OpcionesDiaFicticio {
  curso?: string;
  fechaDescarga?: string;
  area?: 'lenguaje' | 'matematica';
  filas: Array<[number | null, string, ...(string | number | null)[]]>;
  ejes?: string[];
}
