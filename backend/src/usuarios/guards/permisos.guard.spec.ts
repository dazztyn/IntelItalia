import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { PermisosGuard } from './permisos.guard';
import {
  Publica,
  RequierePermisos,
  SolicitudAutorizada,
} from '../decorators/requiere-permisos.decorator';
import { UsuarioAutorizado, UsuariosService } from '../usuarios.service';

class ControladorDePrueba {
  @Publica()
  salud() {}

  @RequierePermisos('cargas.notas')
  subirNotas() {}

  @RequierePermisos('usuarios.gestionar')
  gestionarUsuarios() {}

  sinDecorador() {}
}

function contexto(
  metodo: keyof ControladorDePrueba,
  solicitud: SolicitudAutorizada,
): ExecutionContext {
  return {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    getHandler: () => ControladorDePrueba.prototype[metodo],
    getClass: () => ControladorDePrueba,
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;
}

describe('PermisosGuard', () => {
  const docente: UsuarioAutorizado = {
    id: new Types.ObjectId(),
    rol: 'docente',
    alcance: 'cursosAsignados',
    permisos: ['cargas.notas', 'cargas.asistencia', 'observaciones.crear'],
    cursoIds: [new Types.ObjectId()],
  };
  const obtenerUsuarioAutorizado = jest.fn<
    Promise<UsuarioAutorizado | null>,
    [string]
  >();
  const guard = new PermisosGuard(new Reflector(), {
    obtenerUsuarioAutorizado,
  } as unknown as UsuariosService);
  const conSesion = () =>
    ({ sesion: { usuarioId: String(docente.id) } }) as SolicitudAutorizada;

  beforeEach(() => {
    obtenerUsuarioAutorizado.mockReset().mockResolvedValue(docente);
  });

  it('deja pasar una ruta pública sin sesión', async () => {
    const solicitud = {} as SolicitudAutorizada;

    await expect(guard.canActivate(contexto('salud', solicitud))).resolves.toBe(
      true,
    );
    expect(obtenerUsuarioAutorizado).not.toHaveBeenCalled();
  });

  it('responde 401 sin sesión', async () => {
    await expect(
      guard.canActivate(contexto('subirNotas', {} as SolicitudAutorizada)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('responde 401 si el usuario no existe o está inactivo', async () => {
    obtenerUsuarioAutorizado.mockResolvedValue(null);

    await expect(
      guard.canActivate(contexto('subirNotas', conSesion())),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('responde 403 si el rol no tiene el permiso', async () => {
    await expect(
      guard.canActivate(contexto('gestionarUsuarios', conSesion())),
    ).rejects.toThrow(ForbiddenException);
  });

  it('responde 403 en una ruta sin @RequierePermisos', async () => {
    await expect(
      guard.canActivate(contexto('sinDecorador', conSesion())),
    ).rejects.toThrow(ForbiddenException);
  });

  it('con el permiso deja pasar y deja el usuario en la solicitud', async () => {
    const solicitud = conSesion();

    await expect(
      guard.canActivate(contexto('subirNotas', solicitud)),
    ).resolves.toBe(true);
    expect(obtenerUsuarioAutorizado).toHaveBeenCalledWith(String(docente.id));
    expect(solicitud.usuario).toBe(docente);
  });
});
