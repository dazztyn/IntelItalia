import { Nivel } from '../../cursos/niveles';
import { Area } from '../asignatura.schema';

export interface AsignaturaCatalogo {
  codigo: string;
  nombre: string;
  area: Area;
  aliases: string[];
  niveles: Nivel[];
}