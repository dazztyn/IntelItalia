// Carga datos FICTICIOS para desarrollo: npm run semilla [-- <año>]
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SemillaModule } from './semilla.module';
import { SemillaService } from './semilla.service';

async function main() {
  const logger = new Logger('Semilla');

  if (process.env.NODE_ENV === 'production') {
    logger.error('No se cargan datos ficticios con NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }

  const anio = Number(process.argv[2] ?? new Date().getFullYear());
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    logger.error(`Año inválido: ${process.argv[2]}`);
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(SemillaModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const resumen = await app.get(SemillaService).ejecutar(anio);
    logger.log(
      `Año ${anio}: ${resumen.asignaturasCreadas} asignaturas, ` +
        `${resumen.cursosCreados} cursos y ${resumen.alumnosCreados} alumnos ficticios creados.`,
    );
  } finally {
    await app.close();
  }
}

void main();
