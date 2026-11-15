import type { Area } from '../asignaturas/asignatura.schema';
import type { Nivel } from '../cursos/niveles';
import type { Permiso } from '../usuarios/permisos';
import { parsearDia } from './parsers/dia.parser';

// Registro de las pruebas que se pueden cargar. Agregar una es escribir su lector
// y sumarla a FUENTES: el flujo de carga (vista previa, identificación de alumnos,
// guardado, auditoría) es el mismo para todas. Ver "Cómo agregar una prueba nueva"
// en CLAUDE.md.

export interface FilaLeida {
  /** N° de fila o línea en el archivo, para el informe de errores. */
  fila: number;
  numeroLista: number | null;
  /** Solo para identificar al alumno: nunca se guarda. */
  nombre: string;
  /** Lo que se guarda en `resultadosEvaluacion.resultados`; `null` si no rindió. */
  resultados: Record<string, unknown> | null;
  error?: string;
}

/** Forma común que devuelve el lector de cada fuente: un archivo, un curso. */
export interface ArchivoLeido {
  nivel: Nivel;
  letra: string | null;
  anio: number;
  area: Area;
  ejes: string[];
  filas: FilaLeida[];
}

export interface DefinicionFuente {
  fuente: string;
  /** Código del instrumento en `tiposEvaluacion`. */
  tipoEvaluacion: string;
  /** Permiso que necesita quien carga esta fuente. */
  permiso: Permiso;
  extension: '.xlsx' | '.pdf' | '.csv';
  /** Lanza `FormatoInvalidoError` si el archivo no tiene el formato de la fuente. */
  leer(contenido: Buffer): Promise<ArchivoLeido>;
}

async function leerDia(contenido: Buffer): Promise<ArchivoLeido> {
  const dia = await parsearDia(contenido);
  return {
    ...dia,
    filas: dia.filas.map(({ porcentajesPorEje, porcentajeLogro, ...fila }) => ({
      ...fila,
      resultados: porcentajesPorEje && { porcentajesPorEje, porcentajeLogro },
    })),
  };
}

// ⏳ Letrapps y SEPA se agregan cuando tengan lector (sección 4.4).
export const FUENTES = [
  {
    fuente: 'dia',
    tipoEvaluacion: 'DIA',
    permiso: 'cargas.evaluaciones',
    extension: '.xlsx',
    leer: leerDia,
  },
] as const satisfies readonly DefinicionFuente[];

export type FuenteCarga = (typeof FUENTES)[number]['fuente'];
export const FUENTES_CARGA = FUENTES.map(({ fuente }) => fuente);
