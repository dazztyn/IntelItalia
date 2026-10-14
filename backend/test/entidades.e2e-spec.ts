import { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { AlumnosService } from './../src/alumnos/alumnos.service';
import { AsignaturasService } from './../src/asignaturas/asignaturas.service';
import { CATALOGO_ASIGNATURAS } from './../src/asignaturas/catalogo';
import { CursosService } from './../src/cursos/cursos.service';
import { NIVELES } from './../src/cursos/niveles';
import { SemillaModule } from './../src/semilla/semilla.module';
import {
  ALUMNOS_POR_CURSO,
  SemillaService,
} from './../src/semilla/semilla.service';

// Corre contra MongoDB en memoria (test/entorno-global.ts).
describe('Entidades base (e2e)', () => {
  const ANIO = 2026;
  let app: INestApplicationContext;
  let cursos: CursosService;
  let asignaturas: AsignaturasService;
  let alumnos: AlumnosService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [SemillaModule],
    }).compile();
    app = await modulo.init();

    // Base limpia y con los índices únicos creados (RUT, IPE, curso, código).
    const conexion = app.get<Connection>(getConnectionToken());
    await conexion.dropDatabase();
    for (const modelo of Object.values(conexion.models)) {
      await modelo.syncIndexes();
    }

    cursos = app.get(CursosService);
    asignaturas = app.get(AsignaturasService);
    alumnos = app.get(AlumnosService);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('carga de datos ficticios', () => {
    it('crea el catálogo, un curso por nivel y los alumnos', async () => {
      const resumen = await app.get(SemillaService).ejecutar(ANIO);

      expect(resumen).toEqual({
        asignaturasCreadas: CATALOGO_ASIGNATURAS.length,
        cursosCreados: NIVELES.length,
        alumnosCreados: NIVELES.length * ALUMNOS_POR_CURSO,
      });
    });

    it('no duplica nada si se corre otra vez', async () => {
      const resumen = await app.get(SemillaService).ejecutar(ANIO);

      expect(resumen).toEqual({
        asignaturasCreadas: 0,
        cursosCreados: 0,
        alumnosCreados: 0,
      });
    });
  });

  describe('CursosService', () => {
    it('lista los cursos del año en orden de nivel', async () => {
      const lista = await cursos.listarPorAnio(ANIO);

      expect(lista.map((curso) => curso.nombre)).toEqual([
        'Pre-kínder',
        'Kínder',
        '1° Básico',
        '2° Básico',
        '3° Básico',
        '4° Básico',
        '5° Básico',
        '6° Básico',
        '7° Básico',
        '8° Básico',
      ]);
    });

    it('con un solo curso en el nivel, lo resuelve aunque el archivo traiga letra', async () => {
      const resultado = await cursos.resolverCurso(ANIO, '3', 'A');

      expect(resultado.estado).toBe('encontrado');
    });

    it('con varios cursos en el nivel, exige la letra', async () => {
      await cursos.crear({ anio: ANIO + 1, nivel: '4', letra: 'A' });
      await cursos.crear({ anio: ANIO + 1, nivel: '4', letra: 'B' });

      const conLetra = await cursos.resolverCurso(ANIO + 1, '4', 'b');
      expect(conLetra.estado === 'encontrado' && conLetra.curso.nombre).toBe(
        '4° Básico B',
      );
      expect((await cursos.resolverCurso(ANIO + 1, '4')).estado).toBe(
        'ambiguo',
      );
      expect((await cursos.resolverCurso(ANIO + 1, '5')).estado).toBe(
        'noExiste',
      );
    });

    it('no permite dos cursos iguales el mismo año', async () => {
      await expect(cursos.crear({ anio: ANIO, nivel: '3' })).rejects.toThrow(
        'duplicate key',
      );
    });
  });

  describe('AsignaturasService', () => {
    it('acota un alias repetido a las asignaturas del curso', async () => {
      const resultado = await cursos.resolverCurso(ANIO, '3');
      if (resultado.estado !== 'encontrado') throw new Error('sin 3° básico');

      const sinAcotar = await asignaturas.buscarPorNombre('lenguaje');
      const delCurso = await asignaturas.buscarPorNombre(
        'lenguaje',
        resultado.curso.asignaturaIds,
      );

      expect(sinAcotar).toHaveLength(2);
      expect(delCurso.map((a) => a.codigo)).toEqual(['LEN']);
    });
  });

  describe('AlumnosService', () => {
    async function primerAlumnoDe3ro() {
      const resultado = await cursos.resolverCurso(ANIO, '3');
      if (resultado.estado !== 'encontrado') throw new Error('sin 3° básico');
      const lista = await alumnos.listarPorCurso(resultado.curso._id, ANIO);
      return { curso: resultado.curso, lista };
    }

    it('lista solo las matrículas activas del curso', async () => {
      const { lista } = await primerAlumnoDe3ro();

      // Uno de los alumnos ficticios de cada curso está retirado.
      expect(lista).toHaveLength(ALUMNOS_POR_CURSO - 1);
    });

    it('no permite repetir un RUT', async () => {
      const { lista } = await primerAlumnoDe3ro();
      const conRut = lista.find((alumno) => alumno.rut);

      await expect(
        alumnos.crear({
          rut: conRut?.rut,
          nombres: 'Otro',
          apellidoPaterno: 'Alumno',
        }),
      ).rejects.toThrow('duplicate key');
    });

    it('encuentra a un alumno por nombre sin importar tildes ni orden', async () => {
      const { curso, lista } = await primerAlumnoDe3ro();
      const alumno = lista.find((a) => a.apellidoMaterno);
      if (!alumno) throw new Error('sin alumno con dos apellidos');

      const comoEnLetrapps = [
        alumno.apellidoPaterno,
        alumno.apellidoMaterno,
        alumno.nombres,
      ]
        .join('  ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
      const candidatos = await alumnos.buscarPorNombreEnCurso(
        comoEnLetrapps,
        curso._id,
        ANIO,
      );

      expect(candidatos.map((c) => String(c._id))).toContain(
        String(alumno._id),
      );
    });

    it('no devuelve el dato PIE en las consultas normales', async () => {
      const { lista } = await primerAlumnoDe3ro();

      expect(lista.every((alumno) => alumno.pie === undefined)).toBe(true);
    });

    it('entrega el dato PIE solo cuando se pide explícitamente', async () => {
      const { lista } = await primerAlumnoDe3ro();
      const datos = await Promise.all(
        lista.map((alumno) => alumnos.obtenerDatosPie(alumno._id)),
      );

      expect(datos.filter((pie) => pie?.participa)).toHaveLength(2);
    });
  });
});
