import { Workbook } from 'exceljs';

// Arma en memoria un reporte del DIA con el mismo formato que el real
// (docs/ARQUITECTURA.md, sección 4.4), pero con datos FICTICIOS.
// Nunca usar un archivo real de la escuela en los tests.

export interface OpcionesDiaFicticio {
  curso?: string;
  fechaDescarga?: string;
  area?: 'lenguaje' | 'matematica';
  /** Una fila por alumno: n° de lista, nombre como lo escribe el DIA y porcentajes. */
  filas: Array<[number | null, string, ...(string | number | null)[]]>;
  /** Encabezados de resultados; por defecto, los ejes de Lectura o 3 OA. */
  ejes?: string[];
}

export async function crearDiaFicticio(
  opciones: OpcionesDiaFicticio,
): Promise<Buffer> {
  const area = opciones.area ?? 'lenguaje';
  const ejes =
    opciones.ejes ??
    (area === 'lenguaje'
      ? ['Localizar', 'Interpretar y relacionar', 'Reflexionar']
      : ['OA2', 'OA3', 'OA5']);

  const libro = new Workbook();
  const hoja = libro.addWorksheet('Reporte');
  hoja.getRow(5).values = ['Establecimiento', 'Escuela Ficticia'];
  hoja.getRow(6).values = ['Curso', opciones.curso ?? '3 A'];
  hoja.getRow(7).values = [
    'Fecha de descarga de este reporte',
    opciones.fechaDescarga ?? '23/04/2026 17:09:32',
  ];

  const titulo =
    area === 'lenguaje'
      ? 'EJES DE HABILIDAD'
      : 'Porcentaje de respuestas de cada estudiante según aprendizajes previos';
  hoja.getRow(12).getCell(3).value = titulo;
  hoja.mergeCells(12, 3, 12, 2 + ejes.length);

  hoja.getRow(13).values = [
    'Número de Lista',
    'Nombre del Estudiante',
    ...ejes,
  ];
  opciones.filas.forEach((fila, i) => {
    hoja.getRow(14 + i).values = fila;
  });

  return Buffer.from(await libro.xlsx.writeBuffer());
}
