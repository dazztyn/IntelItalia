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
import { CLIENTE_REDIS_SALUD } from './../src/salud/salud.service';
import { SemillaModule } from './../src/semilla/semilla.module';
import { SemillaService } from './../src/semilla/semilla.service';
import { UsuariosService } from './../src/usuarios/usuarios.service';

/** Cuerpo de la respuesta, sin el `any` de supertest. */
const cuerpo = (respuesta: { body: unknown }) =>
  respuesta.body as Record<string, unknown>;

// Corre contra MongoDB en memoria (test/entorno-global.ts) con datos ficticios.
describe('Ficha del alumno (e2e)', () => {
  const ANIO = 2026;
  let app: INestApplication<App>;
  let directoraId: string;
  let docenteId: string;
  let alumnoDeTercero: string;
  let alumnoConPie: string;
  let alumnoDeCuarto: string;

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

    const cursos = app.get(CursosService);
    const alumnos = app.get(AlumnosService);
    const cursoDe = async (nivel: '3' | '4') => {
      const resultado = await cursos.resolverCurso(ANIO, nivel);
      if (resultado.estado !== 'encontrado') throw new Error(`sin ${nivel}°`);
      return resultado.curso;
    };
    const tercero = await cursoDe('3');
    const deTercero = await alumnos.listarPorCurso(tercero._id, ANIO);
    alumnoDeTercero = String(deTercero[0]._id);
    alumnoDeCuarto = String(
      (await alumnos.listarPorCurso((await cursoDe('4'))._id, ANIO))[0]._id,
    );
    for (const alumno of deTercero.slice(1)) {
      if ((await alumnos.obtenerDatosPie(alumno._id))?.participa) {
        alumnoConPie = String(alumno._id);
        break;
      }
    }

    // Un resultado del DIA ficticio, como lo deja la carga (PGT-54).
    const evaluaciones = app.get(EvaluacionesService);
    await evaluaciones.asegurarTiposIniciales();
    const dia = await evaluaciones.buscarTipoPorCodigo('DIA');
    await evaluaciones.guardarResultado({
      alumnoId: new Types.ObjectId(alumnoDeTercero),
      tipoEvaluacionId: dia!._id,
      cursoId: tercero._id,
      anio: ANIO,
      momento: 'diagnostico',
      area: 'lenguaje',
      resultados: {
        porcentajesPorEje: {
          localizar: 55,
          interpretarRelacionar: 70,
          reflexionar: 20,
        },
        porcentajeLogro: 48.33,
      },
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

  const ficha = (id: string, usuarioId?: string) => {
    const peticion = request(app.getHttpServer()).get(`/api/alumnos/${id}`);
    return usuarioId ? peticion.set('x-usuario-prueba', usuarioId) : peticion;
  };

  it('responde 401 sin sesión', async () => {
    await ficha(alumnoDeTercero).expect(401);
  });

  it('la directora ve datos, matrícula, evaluaciones y el dato PIE', async () => {
    const datos = cuerpo(await ficha(alumnoDeTercero, directoraId).expect(200));

    expect(datos).toMatchObject({
      id: alumnoDeTercero,
      matriculas: [
        { anio: ANIO, estado: 'activa', curso: { nombre: '3° Básico' } },
      ],
      evaluaciones: [
        {
          tipo: 'DIA',
          nombre: 'Diagnóstico Integral de Aprendizajes',
          anio: ANIO,
          momento: 'diagnostico',
          area: 'lenguaje',
          resultados: { porcentajeLogro: 48.33 },
          nivelNormalizado: null,
        },
      ],
      semaforo: null,
      alertas: [],
    });
    expect(datos).toHaveProperty('pie');
    expect(datos).not.toHaveProperty('nombreNormalizado');

    const conPie = cuerpo(await ficha(alumnoConPie, directoraId).expect(200));
    expect(conPie.pie).toMatchObject({ participa: true });
  });

  it('un docente ve la ficha de su curso, sin el dato PIE', async () => {
    const datos = cuerpo(await ficha(alumnoConPie, docenteId).expect(200));

    expect(datos).not.toHaveProperty('pie');
  });

  it('un docente recibe 403 con un alumno de otro curso', async () => {
    await ficha(alumnoDeCuarto, docenteId).expect(403);
  });

  it('responde 400 con un id inválido y 404 si el alumno no existe', async () => {
    await ficha('no-es-un-id', directoraId).expect(400);
    await ficha(String(new Types.ObjectId()), directoraId).expect(404);
  });

  it('registra en la auditoría cada acceso y cada rechazo', async () => {
    const auditoria = app.get<Model<RegistroAuditoria>>(
      getModelToken(RegistroAuditoria.name),
    );
    // El registro es asíncrono (evento): se espera a que aparezca.
    const contar = (accion: string, alumnoId: string) =>
      auditoria.countDocuments({
        accion,
        alumnoId: new Types.ObjectId(alumnoId),
      });
    for (let intento = 0; intento < 20; intento++) {
      if ((await contar('accesoDenegado', alumnoDeCuarto)) > 0) break;
      await new Promise((resolver) => setTimeout(resolver, 50));
    }

    expect(await contar('ficha.ver', alumnoDeTercero)).toBe(1);
    expect(await contar('ficha.ver', alumnoConPie)).toBe(2);
    expect(await contar('accesoDenegado', alumnoDeCuarto)).toBe(1);
  });
});
