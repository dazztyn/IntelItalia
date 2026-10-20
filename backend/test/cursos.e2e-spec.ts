import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configurarApp } from './../src/configurar-app';
import { CursosService } from './../src/cursos/cursos.service';
import { CLIENTE_REDIS_SALUD } from './../src/salud/salud.service';
import { SemillaModule } from './../src/semilla/semilla.module';
import {
  ALUMNOS_POR_CURSO,
  SemillaService,
} from './../src/semilla/semilla.service';
import type { SolicitudAutorizada } from './../src/usuarios/decorators/requiere-permisos.decorator';
import { UsuariosService } from './../src/usuarios/usuarios.service';

// Corre contra MongoDB en memoria (test/entorno-global.ts) con datos ficticios.
describe('Cursos y alumnos por curso (e2e)', () => {
  const ANIO = 2026;
  let app: INestApplication<App>;
  let directoraId: string;
  let docenteId: string;
  let tercero: string;
  let cuarto: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule, SemillaModule],
    })
      .overrideProvider(CLIENTE_REDIS_SALUD)
      .useValue({ ping: jest.fn(), quit: jest.fn().mockResolvedValue('OK') })
      .compile();

    app = modulo.createNestApplication();
    // Solo en el test: simula la sesión que llenará el login (PGT-6).
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
    const idDe = async (nivel: '3' | '4') => {
      const resultado = await cursos.resolverCurso(ANIO, nivel);
      if (resultado.estado !== 'encontrado') throw new Error(`sin ${nivel}°`);
      return resultado.curso._id;
    };
    const idTercero = await idDe('3');
    tercero = String(idTercero);
    cuarto = String(await idDe('4'));

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
          cursoIds: [idTercero],
        })
      )._id,
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (ruta: string, usuarioId?: string) => {
    const peticion = request(app.getHttpServer()).get(ruta);
    return usuarioId ? peticion.set('x-usuario-prueba', usuarioId) : peticion;
  };
  /** Cuerpo de una respuesta 200 que es una lista. */
  const lista = async (ruta: string, usuarioId: string) =>
    (await get(ruta, usuarioId).expect(200)).body as Record<string, unknown>[];

  describe('GET /api/cursos', () => {
    it('responde 401 sin sesión', async () => {
      await get(`/api/cursos?anio=${ANIO}`).expect(401);
    });

    it('la directora ve todos los cursos del año', async () => {
      const body = await lista(`/api/cursos?anio=${ANIO}`, directoraId);

      expect(body).toHaveLength(10);
      expect(body[0]).toEqual({
        id: expect.any(String) as unknown,
        anio: ANIO,
        nivel: 'PK',
        letra: null,
        nombre: 'Pre-kínder',
      });
    });

    it('un docente solo ve sus cursos', async () => {
      const body = await lista(`/api/cursos?anio=${ANIO}`, docenteId);

      expect(body).toEqual([expect.objectContaining({ id: tercero })]);
    });

    it('responde 400 si el año no es un número', async () => {
      await get('/api/cursos?anio=abc', directoraId).expect(400);
    });
  });

  describe('GET /api/cursos/:id/alumnos', () => {
    it('un docente ve los alumnos activos de su curso, sin datos sensibles', async () => {
      const body = await lista(`/api/cursos/${tercero}/alumnos`, docenteId);

      // Uno de los alumnos ficticios de cada curso está retirado.
      expect(body).toHaveLength(ALUMNOS_POR_CURSO - 1);
      for (const alumno of body) {
        expect(Object.keys(alumno).sort()).toEqual([
          'apellidoMaterno',
          'apellidoPaterno',
          'id',
          'ipe',
          'nombres',
          'rut',
        ]);
      }
    });

    it('un docente recibe 403 en un curso que no tiene asignado', async () => {
      await get(`/api/cursos/${cuarto}/alumnos`, docenteId).expect(403);
    });

    it('la directora ve los alumnos de cualquier curso', async () => {
      const body = await lista(`/api/cursos/${cuarto}/alumnos`, directoraId);

      expect(body).toHaveLength(ALUMNOS_POR_CURSO - 1);
    });

    it('responde 400 con un id inválido y 404 si el curso no existe', async () => {
      await get('/api/cursos/no-es-un-id/alumnos', directoraId).expect(400);
      await get(
        `/api/cursos/${String(new Types.ObjectId())}/alumnos`,
        directoraId,
      ).expect(404);
    });

    it('responde 401 sin sesión', async () => {
      await get(`/api/cursos/${tercero}/alumnos`).expect(401);
    });
  });
});
