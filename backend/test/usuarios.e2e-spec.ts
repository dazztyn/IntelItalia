import { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import { NucleoModule } from './../src/nucleo.module';
import { PERMISOS } from './../src/usuarios/permisos';
import { Rol } from './../src/usuarios/schemas/rol.schema';
import { UsuariosModule } from './../src/usuarios/usuarios.module';
import { UsuariosService } from './../src/usuarios/usuarios.service';

// Corre contra MongoDB en memoria (test/entorno-global.ts).
describe('Usuarios y roles (e2e)', () => {
  let app: INestApplicationContext;
  let usuarios: UsuariosService;
  let roles: Model<Rol>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [NucleoModule, UsuariosModule],
    }).compile();
    app = await modulo.init();

    usuarios = app.get(UsuariosService);
    roles = app.get<Model<Rol>>(getModelToken(Rol.name));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('al iniciar crea el rol docente con sus permisos', async () => {
    const docente = await roles.findOne({ codigo: 'docente' }).lean().exec();

    expect(docente).toMatchObject({
      alcance: 'cursosAsignados',
      permisos: [
        'alumnos.ver',
        'alertas.ver',
        'cargas.notas',
        'cargas.asistencia',
        'observaciones.crear',
      ],
    });
  });

  it('al iniciar crea el rol directora con todos los permisos', async () => {
    const directora = await roles
      .findOne({ codigo: 'directora' })
      .lean()
      .exec();

    expect(directora?.alcance).toBe('escuela');
    expect(directora?.permisos).toEqual([...PERMISOS]);
  });

  describe('con la base limpia', () => {
    beforeAll(async () => {
      const conexion = app.get<Connection>(getConnectionToken());
      await conexion.dropDatabase();
      for (const modelo of Object.values(conexion.models)) {
        await modelo.syncIndexes();
      }
    });

    it('crea los roles que faltan y no los duplica', async () => {
      expect(await usuarios.asegurarRolesIniciales()).toBe(2);
      expect(await usuarios.asegurarRolesIniciales()).toBe(0);
      expect(await roles.countDocuments()).toBe(2);
    });

    it('no pisa los permisos que se editaron después', async () => {
      await roles.updateOne(
        { codigo: 'docente' },
        { $pull: { permisos: 'alertas.ver' } },
      );

      await usuarios.asegurarRolesIniciales();

      const docente = await roles.findOne({ codigo: 'docente' }).exec();
      expect(docente?.permisos).not.toContain('alertas.ver');
    });

    it('la directora recupera los permisos que se le quitaron', async () => {
      await roles.updateOne(
        { codigo: 'directora' },
        { $pull: { permisos: { $in: ['usuarios.gestionar', 'pie.ver'] } } },
      );

      await usuarios.asegurarRolesIniciales();

      const directora = await roles.findOne({ codigo: 'directora' }).exec();
      expect([...(directora?.permisos ?? [])].sort()).toEqual(
        [...PERMISOS].sort(),
      );
    });

    it('entrega los permisos y el alcance de la directora', async () => {
      const usuario = await usuarios.crear({
        correo: 'directora.ficticia@ejemplo.cl',
        nombre: 'Directora Ficticia',
        rol: 'directora',
      });

      const autorizada = await usuarios.obtenerUsuarioAutorizado(
        String(usuario._id),
      );

      expect(autorizada?.alcance).toBe('escuela');
      expect(autorizada?.permisos).toHaveLength(PERMISOS.length);
    });

    it('entrega los permisos y cursos de un docente activo', async () => {
      const cursoId = new Types.ObjectId();
      const usuario = await usuarios.crear({
        correo: 'Docente.Ficticio@Ejemplo.cl',
        nombre: 'Docente Ficticio',
        rol: 'docente',
        cursoIds: [cursoId],
      });

      const autorizado = await usuarios.obtenerUsuarioAutorizado(
        String(usuario._id),
      );

      expect(usuario.correo).toBe('docente.ficticio@ejemplo.cl');
      expect(autorizado).toMatchObject({
        rol: 'docente',
        alcance: 'cursosAsignados',
        permisos: expect.arrayContaining(['cargas.notas']) as unknown,
      });
      expect(autorizado?.cursoIds.map(String)).toEqual([String(cursoId)]);
    });

    it('no autoriza a un usuario inactivo, sin rol o inexistente', async () => {
      const inactivo = await usuarios.crear({
        correo: 'inactivo@ejemplo.cl',
        nombre: 'Inactivo',
        rol: 'docente',
        activo: false,
      });
      const sinRol = await usuarios.crear({
        correo: 'sin.rol@ejemplo.cl',
        nombre: 'Sin Rol',
        rol: 'rolQueNoExiste',
      });

      for (const id of [
        String(inactivo._id),
        String(sinRol._id),
        String(new Types.ObjectId()),
        'no-es-un-id',
      ]) {
        expect(await usuarios.obtenerUsuarioAutorizado(id)).toBeNull();
      }
    });

    it('no permite repetir un correo', async () => {
      await expect(
        usuarios.crear({
          correo: 'INACTIVO@ejemplo.cl',
          nombre: 'Otro',
          rol: 'docente',
        }),
      ).rejects.toThrow('duplicate key');
    });
  });
});
