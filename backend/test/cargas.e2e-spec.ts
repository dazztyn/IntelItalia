import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AlumnosService } from './../src/alumnos/alumnos.service';
import { AppModule } from './../src/app.module';
import { RegistroAuditoria } from './../src/auditoria/schemas/registro-auditoria.schema';
import type { SolicitudAutorizada } from './../src/comun/autorizacion';
import { configurarApp } from './../src/configurar-app';
import { CursosService } from './../src/cursos/cursos.service';
import { EvaluacionesService } from './../src/evaluaciones/evaluaciones.service';
import { ResultadoEvaluacion } from './../src/evaluaciones/schemas/resultado-evaluacion.schema';
import { CLIENTE_REDIS_SALUD } from './../src/salud/salud.service';
import { SemillaModule } from './../src/semilla/semilla.module';
import { SemillaService } from './../src/semilla/semilla.service';
import { UsuariosService } from './../src/usuarios/usuarios.service';
import { crearDiaFicticio } from './utilidades/dia-ficticio';

interface Fila {
  fila: number;
  estado: string;
  alumnoId: string | null;
  candidatos: Array<{ id: string }>;
}
interface Carga {
  id: string;
  estado: string;
  filasTotales: number;
  filasOk: number;
  errores: Array<{ fila: number; mensaje: string }>;
}

/** Cuerpo de la respuesta, sin el `any` de supertest. */
const cuerpo = (respuesta: { body: unknown }): unknown => respuesta.body;

// Corre contra MongoDB en memoria (test/entorno-global.ts) con datos FICTICIOS:
// el archivo DIA se arma en el test con nombres de la semilla.
describe('Carga del DIA (e2e)', () => {
  const ANIO = 2026;
  let app: INestApplication<App>;
  let directoraId: string;
  let docenteId: string;
  let archivo: Buffer;
  let alumnoDeCuarto: string;
  let alumnoSinCoincidencia: string;
  let resultados: Model<ResultadoEvaluacion>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule, SemillaModule],
    })
      .overrideProvider(CLIENTE_REDIS_SALUD)
      .useValue({ ping: jest.fn(), quit: jest.fn().mockResolvedValue('OK') })
      .compile();

    app = modulo.createNestApplication();
    // Solo en el test: simula la sesión que llena el login.
    app.use((solicitud: Request, _respuesta: Response, next: NextFunction) => {
      const usuarioId = solicitud.header('x-usuario-prueba');
      if (usuarioId) (solicitud as SolicitudAutorizada).sesion = { usuarioId };
      next();
    });
    configurarApp(app);
    await app.init();

    const conexion = app.get<Connection>(getConnectionToken());
    await conexion.dropDatabase();
    for (const modelo of Object.values(conexion.models)) {
      await modelo.syncIndexes();
    }
    await app.get(SemillaService).ejecutar(ANIO);
    await app.get(EvaluacionesService).asegurarTiposIniciales();
    resultados = app.get<Model<ResultadoEvaluacion>>(
      getModelToken(ResultadoEvaluacion.name),
    );

    // Alumnos ficticios de 3° y 4° básico.
    const cursos = app.get(CursosService);
    const alumnos = app.get(AlumnosService);
    const cursoDe = async (nivel: '3' | '4') => {
      const resultado = await cursos.resolverCurso(ANIO, nivel);
      if (resultado.estado !== 'encontrado') throw new Error(`sin ${nivel}°`);
      return resultado.curso;
    };
    const tercero = await cursoDe('3');
    const [a, b, c, d] = await alumnos.listarPorCurso(tercero._id, ANIO);
    alumnoSinCoincidencia = String(d._id);
    alumnoDeCuarto = String(
      (await alumnos.listarPorCurso((await cursoDe('4'))._id, ANIO))[0]._id,
    );
    // Un homónimo de `c` en el mismo curso, para el caso ambiguo.
    await alumnos.crear({
      ipe: 'IPE-HOMONIMO-1',
      nombres: c.nombres,
      apellidoPaterno: c.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno,
      matriculas: [{ anio: ANIO, cursoId: tercero._id }],
    });

    // Como lo escribe el DIA: APELLIDOS NOMBRES, en mayúsculas.
    const comoDia = (alumno: typeof a) =>
      [alumno.apellidoPaterno, alumno.apellidoMaterno, alumno.nombres]
        .filter(Boolean)
        .join(' ')
        .toUpperCase();
    archivo = await crearDiaFicticio({
      curso: '3 A',
      filas: [
        [1, comoDia(a), '55,5', '70', '20'], // 14: encontrado
        // 15: otro orden y sin tildes, igual se encuentra
        [
          2,
          `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ''}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, ''),
          10,
          20,
          30,
        ],
        [3, comoDia(c), 40, 50, 60], // 16: ambiguo (homónimo)
        [4, 'NOMBRE QUE NO EXISTE', 80, 80, 80], // 17: noEncontrado
        [5, comoDia(d), null, null, null], // 18: sin resultado (no rindió)
      ],
    });

    const usuarios = app.get(UsuariosService);
    await usuarios.asegurarRolesIniciales();
    directoraId = String(
      (
        await usuarios.crear({
          correo: 'directora.ficticia@ejemplo.cl',
          nombre: 'Directora Ficticia',
          rol: 'directora',
        })
      )._id,
    );
    docenteId = String(
      (
        await usuarios.crear({
          correo: 'docente.ficticio@ejemplo.cl',
          nombre: 'Docente Ficticio',
          rol: 'docente',
          cursoIds: [tercero._id],
        })
      )._id,
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  const subir = (
    ruta: string,
    usuarioId: string | null,
    campos: Record<string, string> = {},
    contenido: Buffer = archivo,
    nombre = 'dia-3a-lectura.xlsx',
  ) => {
    let peticion = request(app.getHttpServer())
      .post(ruta)
      .attach('archivo', contenido, nombre)
      .field('fuente', campos.fuente ?? 'dia')
      .field('momento', campos.momento ?? 'diagnostico');
    if (campos.resoluciones) {
      peticion = peticion.field('resoluciones', campos.resoluciones);
    }
    return usuarioId ? peticion.set('x-usuario-prueba', usuarioId) : peticion;
  };

  describe('POST /api/cargas/vista-previa', () => {
    it('identifica a cada alumno sin guardar nada', async () => {
      const body = cuerpo(
        await subir('/api/cargas/vista-previa', directoraId).expect(200),
      );
      const vista = body as {
        curso: { nombre: string };
        anio: number;
        area: string;
        filas: Fila[];
      };

      expect(vista).toMatchObject({
        curso: { nombre: '3° Básico' },
        anio: ANIO,
        area: 'lenguaje',
      });
      expect(vista.filas.map((f) => f.estado)).toEqual([
        'encontrado',
        'encontrado',
        'ambiguo',
        'noEncontrado',
        'sinResultado',
      ]);
      expect(vista.filas[2].candidatos).toHaveLength(2);
      expect(await resultados.countDocuments()).toBe(0);
    });

    it('responde 401 sin sesión y 403 sin el permiso cargas.evaluaciones', async () => {
      await subir('/api/cargas/vista-previa', null).expect(401);
      await subir('/api/cargas/vista-previa', docenteId).expect(403);
    });

    it('rechaza archivos, fuentes y momentos inválidos', async () => {
      await subir(
        '/api/cargas/vista-previa',
        directoraId,
        {},
        Buffer.from('x'),
        'notas.csv',
      ).expect(400);
      await subir(
        '/api/cargas/vista-previa',
        directoraId,
        {},
        Buffer.from('x'),
      ).expect(400);
      await subir('/api/cargas/vista-previa', directoraId, {
        fuente: 'miAulaNotas',
      }).expect(400);
      await subir('/api/cargas/vista-previa', directoraId, {
        momento: 'final',
      }).expect(400);
    });
  });

  describe('POST /api/cargas', () => {
    it('sin resolver las filas dudosas, guarda las identificadas y marca errores', async () => {
      const body = cuerpo(await subir('/api/cargas', directoraId).expect(201));
      const carga = body as Carga;

      expect(carga).toMatchObject({
        estado: 'completadaConErrores',
        filasTotales: 5,
        filasOk: 2,
      });
      expect(carga.errores.map((e) => e.fila)).toEqual([16, 17]);
      expect(await resultados.countDocuments()).toBe(2);
    });

    it('con las filas resueltas guarda todo y no duplica lo ya cargado', async () => {
      const vista = cuerpo(
        await subir('/api/cargas/vista-previa', directoraId).expect(200),
      );
      const filas = (vista as { filas: Fila[] }).filas;
      const resoluciones = JSON.stringify({
        16: filas[2].candidatos[0].id,
        17: alumnoSinCoincidencia,
      });

      const body = cuerpo(
        await subir('/api/cargas', directoraId, {
          resoluciones,
        }).expect(201),
      );

      expect(body).toMatchObject({
        estado: 'completada',
        filasOk: 4,
        errores: [],
      });
      expect(await resultados.countDocuments()).toBe(4);
      const guardado = await resultados
        .findOne({ alumnoId: new Types.ObjectId(filas[0].alumnoId!) })
        .lean();
      expect(guardado).toMatchObject({
        anio: ANIO,
        momento: 'diagnostico',
        area: 'lenguaje',
        nivelNormalizado: null,
        resultados: {
          porcentajesPorEje: {
            localizar: 55.5,
            interpretarRelacionar: 70,
            reflexionar: 20,
          },
          porcentajeLogro: 48.5,
        },
      });
    });

    it('no acepta un alumno de otro curso ni resoluciones mal formadas', async () => {
      const body = cuerpo(
        await subir('/api/cargas', directoraId, {
          resoluciones: JSON.stringify({ 16: null, 17: alumnoDeCuarto }),
        }).expect(201),
      );

      expect((body as Carga).errores).toEqual([
        {
          fila: 17,
          campo: 'nombre',
          mensaje: 'El alumno elegido no está matriculado en el curso',
        },
      ]);
      await subir('/api/cargas', directoraId, {
        resoluciones: '{"16": "no-es-un-id"}',
      }).expect(400);
    });
  });

  describe('GET /api/cargas', () => {
    it('lista el historial y muestra el detalle con errores', async () => {
      const historial = cuerpo(
        await request(app.getHttpServer())
          .get('/api/cargas')
          .set('x-usuario-prueba', directoraId)
          .expect(200),
      );
      const cargas = historial as Carga[];
      expect(cargas).toHaveLength(3);
      expect(cargas[0]).not.toHaveProperty('errores');

      const conErrores = cargas.find(
        (c) => c.estado === 'completadaConErrores',
      )!;
      const detalle = cuerpo(
        await request(app.getHttpServer())
          .get(`/api/cargas/${conErrores.id}`)
          .set('x-usuario-prueba', directoraId)
          .expect(200),
      );
      expect((detalle as Carga).errores.length).toBeGreaterThan(0);
    });

    it('registra cada carga en la auditoría', async () => {
      const auditoria = app.get<Model<RegistroAuditoria>>(
        getModelToken(RegistroAuditoria.name),
      );
      // El registro es asíncrono (evento): se espera a que aparezca.
      let registros = 0;
      for (let intento = 0; intento < 20 && registros < 3; intento++) {
        registros = await auditoria.countDocuments({ accion: 'carga.crear' });
        if (registros < 3) await new Promise((r) => setTimeout(r, 50));
      }
      expect(registros).toBe(3);
    });
  });
});
