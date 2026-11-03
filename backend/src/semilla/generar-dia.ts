// Genera un reporte DIA FICTICIO (.xlsx) para probar la carga a mano o en una demo:
//   npm run dia-ficticio [-- <nivel> <area> <año>]     p. ej. npm run dia-ficticio -- 3 lenguaje 2026
// Usa los mismos alumnos que crea `npm run semilla` (el generador es determinista),
// así que hay que haber corrido la semilla con el mismo año. Nunca usa datos reales.
import { Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { normalizarTexto } from '../comun/texto';
import { NIVELES, type Nivel } from '../cursos/niveles';
import { parsearDia } from '../cargas/parsers/dia.parser';
import { crearDiaFicticio } from './dia-ficticio';
import { crearAleatorio, generarAlumnosFicticios } from './datos-ficticios';
import { ALUMNOS_POR_CURSO } from './semilla.service';

const CARPETA_SALIDA = join(__dirname, '..', '..', 'archivos-ficticios');

async function main() {
  const logger = new Logger('DiaFicticio');
  if (process.env.NODE_ENV === 'production') {
    logger.error('No se generan archivos ficticios con NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }

  const [nivelArg = '3', areaArg = 'lenguaje', anioArg] = process.argv.slice(2);
  const nivel = nivelArg as Nivel;
  const area = areaArg as 'lenguaje' | 'matematica';
  const anio = Number(anioArg ?? new Date().getFullYear());
  // El DIA se aplica de 2° a 8° básico.
  if (!NIVELES.includes(nivel) || ['PK', 'K', '1'].includes(nivel)) {
    logger.error(`Nivel inválido: ${nivelArg} (usar 2 a 8)`);
    process.exitCode = 1;
    return;
  }
  if (area !== 'lenguaje' && area !== 'matematica') {
    logger.error(`Área inválida: ${areaArg} (usar lenguaje o matematica)`);
    process.exitCode = 1;
    return;
  }

  const aleatorio = crearAleatorio(500 + NIVELES.indexOf(nivel));
  const porcentaje = () =>
    (Math.round(aleatorio() * 10000) / 100).toFixed(2).replace('.', ',');
  const columnas = area === 'lenguaje' ? 3 : 4;
  const resultados = () => Array.from({ length: columnas }, porcentaje);

  const alumnos = generarAlumnosFicticios(
    NIVELES.indexOf(nivel),
    ALUMNOS_POR_CURSO,
  ).filter((alumno) => !alumno.retirado);

  // Como lo escribe el DIA: APELLIDOS NOMBRES, en mayúsculas. Con casos para la
  // vista previa: un nombre en otro orden y sin tildes (se encuentra igual), un
  // alumno que no rindió y un nombre que no existe en el curso.
  const filas = alumnos.map((alumno, i) => {
    const comoDia = [
      alumno.apellidoPaterno,
      alumno.apellidoMaterno,
      alumno.nombres,
    ]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
    const nombre =
      i === 4
        ? normalizarTexto(
            `${alumno.nombres} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno ?? ''}`,
          )
        : comoDia;
    const valores =
      i === 6 ? Array.from({ length: columnas }, () => null) : resultados();
    return [i + 1, nombre, ...valores] as [
      number,
      string,
      ...(string | null)[],
    ];
  });
  filas.push([
    alumnos.length + 1,
    'ALUMNO INVENTADO PARA LA PRUEBA',
    ...resultados(),
  ]);

  const fecha = `15/04/${anio} 10:30:00`;
  const contenido = await crearDiaFicticio({
    curso: `${nivel} A`,
    fechaDescarga: fecha,
    area,
    ejes: area === 'matematica' ? ['OA2', 'OA3', 'OA5', 'OA7'] : undefined,
    filas,
  });

  // Autocomprobación: el archivo tiene que poder leerlo el mismo parser de la carga.
  const leido = await parsearDia(contenido);

  mkdirSync(CARPETA_SALIDA, { recursive: true });
  const ruta = join(CARPETA_SALIDA, `dia-${nivel}basico-${area}-${anio}.xlsx`);
  writeFileSync(ruta, contenido);
  logger.log(
    `${ruta}\n  ${leido.filas.length} filas (${nivel}° básico, ${leido.area}, ${leido.anio}). ` +
      `Esperado en la vista previa: ${alumnos.length - 1} encontrados, 1 sin resultado, 1 no encontrado.`,
  );
}

void main();
