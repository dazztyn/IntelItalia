import { Row, Workbook, Worksheet } from 'exceljs';
import { normalizarTexto } from '../../comun/texto';
import { NIVELES, type Nivel } from '../../cursos/niveles';

// Lector del reporte del DIA (.xlsx, un archivo por curso y área). Formato en
// docs/ARQUITECTURA.md, sección 4.4. Solo lee las columnas que se usan.

export class FormatoInvalidoError extends Error {}

export interface FilaDia {
  /** N° de fila en Excel, para el informe de errores. */
  fila: number;
  numeroLista: number | null;
  /** Solo para identificar al alumno: nunca se guarda. */
  nombre: string;
  /** `null` si el alumno no tiene resultados (no rindió). */
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

const EJES_LECTURA: Record<string, string> = {
  LOCALIZAR: 'localizar',
  'INTERPRETAR Y RELACIONAR': 'interpretarRelacionar',
  REFLEXIONAR: 'reflexionar',
};

export async function parsearDia(contenido: Buffer): Promise<ArchivoDia> {
  const libro = new Workbook();
  try {
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  } catch {
    throw new FormatoInvalidoError('El archivo no es un Excel (.xlsx) válido');
  }
  const hoja = libro.worksheets[0];
  if (!hoja) throw new FormatoInvalidoError('El archivo no tiene hojas');

  const filaEncabezados = buscarFila(hoja, 'NOMBRE DEL ESTUDIANTE');
  if (!filaEncabezados) {
    throw new FormatoInvalidoError(
      'No se encontró la columna "Nombre del Estudiante"',
    );
  }

  const { nivel, letra } = leerCurso(valorDeEtiqueta(hoja, 'CURSO'));
  const anio = leerAnio(valorDeEtiqueta(hoja, 'FECHA DE DESCARGA'));
  const area = leerArea(textosDeFila(hoja, filaEncabezados - 1).join(' '));

  // Columnas: n° de lista, nombre y una por eje (Lectura) u OA (Matemática).
  const columnas = new Map<number, string>();
  let colLista = 0;
  let colNombre = 0;
  hoja.getRow(filaEncabezados).eachCell((celda, col) => {
    const encabezado = normalizarTexto(celda.text);
    if (encabezado === 'NUMERO DE LISTA') colLista = col;
    else if (encabezado === 'NOMBRE DEL ESTUDIANTE') colNombre = col;
    else if (encabezado) columnas.set(col, claveEje(area, encabezado));
  });
  if (columnas.size === 0) {
    throw new FormatoInvalidoError('El archivo no trae columnas de resultados');
  }

  const filas: FilaDia[] = [];
  for (let n = filaEncabezados + 1; n <= hoja.rowCount; n++) {
    const fila = hoja.getRow(n);
    const nombre = fila.getCell(colNombre).text.trim();
    if (!nombre) continue;

    const textoLista = colLista ? fila.getCell(colLista).text.trim() : '';
    const lista = textoLista ? Number(textoLista) : NaN;
    filas.push({
      fila: n,
      numeroLista: Number.isInteger(lista) ? lista : null,
      nombre,
      ...leerPorcentajes(fila, columnas),
    });
  }
  if (filas.length === 0) {
    throw new FormatoInvalidoError('El archivo no trae alumnos');
  }

  return { nivel, letra, anio, area, ejes: [...columnas.values()], filas };
}

function leerPorcentajes(
  fila: Row,
  columnas: Map<number, string>,
): Pick<FilaDia, 'porcentajesPorEje' | 'porcentajeLogro' | 'error'> {
  const porcentajes: Record<string, number> = {};
  const faltan: string[] = [];
  for (const [col, eje] of columnas) {
    const { value, text } = fila.getCell(col);
    // Vienen como texto con coma decimal ("73,08"); a veces como número.
    const crudo = typeof value === 'number' ? String(value) : text.trim();
    if (!crudo) {
      faltan.push(eje);
      continue;
    }
    const numero = Number(crudo.replace(',', '.'));
    if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
      return sinDatos(`Porcentaje inválido en ${eje}`);
    }
    porcentajes[eje] = numero;
  }

  // Sin ningún valor = no rindió: se registra como "sin resultado", nunca como 0%.
  if (faltan.length === columnas.size) return sinDatos();
  if (faltan.length > 0)
    return sinDatos(`Faltan porcentajes: ${faltan.join(', ')}`);

  const valores = Object.values(porcentajes);
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  return {
    porcentajesPorEje: porcentajes,
    porcentajeLogro: Math.round(promedio * 100) / 100,
  };
}

function sinDatos(error?: string) {
  return { porcentajesPorEje: null, porcentajeLogro: null, error };
}

function claveEje(area: ArchivoDia['area'], encabezado: string): string {
  if (area === 'matematica') return encabezado.replace(/\s+/g, ''); // "OA 2" → "OA2"
  const clave = EJES_LECTURA[encabezado];
  if (!clave) {
    throw new FormatoInvalidoError(`Eje de Lectura desconocido: ${encabezado}`);
  }
  return clave;
}

/** "3 A", "3°B", "3 Básico A" → nivel 3, letra A. */
function leerCurso(valor: string): { nivel: Nivel; letra: string | null } {
  const coincidencia = /^(\d)\D*?([A-Z])?$/.exec(
    normalizarTexto(valor).replace(/ BASICO/, ''),
  );
  const nivel = coincidencia?.[1] as Nivel | undefined;
  if (!nivel || !NIVELES.includes(nivel)) {
    throw new FormatoInvalidoError(`Curso no reconocido: "${valor}"`);
  }
  return { nivel, letra: coincidencia?.[2] ?? null };
}

/** El año sale de la fecha de descarga ("23/04/2026 17:09:32"): el DIA no lo trae. */
function leerAnio(valor: string): number {
  const anio = /\b(20\d{2})\b/.exec(valor)?.[1];
  if (!anio) {
    throw new FormatoInvalidoError(
      `Fecha de descarga no reconocida: "${valor}"`,
    );
  }
  return Number(anio);
}

function leerArea(titulo: string): ArchivoDia['area'] {
  const texto = normalizarTexto(titulo);
  if (texto.includes('EJES DE HABILIDAD')) return 'lenguaje';
  if (texto.includes('PORCENTAJE DE RESPUESTAS')) return 'matematica';
  throw new FormatoInvalidoError(
    'No se reconoce el área (Lectura o Matemática)',
  );
}

function textosDeFila(hoja: Worksheet, n: number): string[] {
  const textos: string[] = [];
  hoja.getRow(n).eachCell((celda) => {
    const texto = celda.text.trim();
    // Las celdas combinadas repiten el texto: se toma una vez.
    if (texto && !textos.includes(texto)) textos.push(texto);
  });
  return textos;
}

function buscarFila(hoja: Worksheet, etiqueta: string): number | null {
  for (let n = 1; n <= Math.min(hoja.rowCount, 30); n++) {
    if (textosDeFila(hoja, n).some((t) => normalizarTexto(t) === etiqueta)) {
      return n;
    }
  }
  return null;
}

/** Valor de una fila de encabezado del tipo "Curso | 3 A". */
function valorDeEtiqueta(hoja: Worksheet, etiqueta: string): string {
  for (let n = 1; n <= Math.min(hoja.rowCount, 30); n++) {
    const [primero, segundo] = textosDeFila(hoja, n);
    if (primero && normalizarTexto(primero).startsWith(etiqueta)) {
      return segundo ?? '';
    }
  }
  throw new FormatoInvalidoError(
    `No se encontró "${etiqueta}" en el encabezado`,
  );
}
