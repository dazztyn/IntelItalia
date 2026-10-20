import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { VariablesEntorno } from '../configuracion/validacion';
import { Permiso, ROLES_INICIALES } from './permisos';
import { RolesRepository } from './repositorios/roles.repository';
import {
  UsuariosRepository
} from './repositorios/usuarios.repository';
import { RolDocument } from './schemas/rol.schema';
import { UsuarioDocument } from './schemas/usuario.schema';
import { DatosActualizarUsuario, DatosCrearUsuario } from './interfaces/datos-usuario.interface';

export type { UsuarioAutorizado } from '../comun/autorizacion';
export type DatosUsuario = DatosCrearUsuario;

@Injectable()
export class UsuariosService implements OnModuleInit {
  constructor(
    private readonly usuariosRepo: UsuariosRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly configuracion: ConfigService<VariablesEntorno, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.asegurarRolesIniciales();

    const correoDirectora = this.configuracion.get(
      'CORREO_DIRECTORA_INICIAL',
      { infer: true },
    );
    if (correoDirectora) {
      await this.usuariosRepo.asegurarDirectoraInicial(correoDirectora);
    }
  }

  asegurarRolesIniciales(): Promise<number> {
    return this.rolesRepo.asegurarRolesIniciales(ROLES_INICIALES);
  }

  crear(datos: DatosUsuario): Promise<UsuarioDocument> {
    return this.usuariosRepo.crear(datos);
  }

  async registrarEnListaBlanca(datos: DatosUsuario): Promise<UsuarioDocument> {
    const rol = await this.rolesRepo.buscarPorCodigo(datos.rol);
    if (!rol) {
      throw new BadRequestException(`El rol '${datos.rol}' no existe`);
    }

    const existente = await this.usuariosRepo.buscarPorCorreo(datos.correo);
    if (existente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo',
      );
    }

    return this.usuariosRepo.crear(datos);
  }

  listarUsuarios(): Promise<UsuarioDocument[]> {
    return this.usuariosRepo.listarTodos();
  }

  listarRoles(): Promise<RolDocument[]> {
    return this.rolesRepo.listarTodos();
  }

  async actualizarUsuario(
    id: string,
    datos: DatosActualizarUsuario,
    usuarioActualId?: Types.ObjectId,
  ): Promise<UsuarioDocument> {
    if (datos.rol) {
      const rol = await this.rolesRepo.buscarPorCodigo(datos.rol);
      if (!rol) {
        throw new BadRequestException(`El rol '${datos.rol}' no existe`);
      }
    }

    if (
      datos.activo === false &&
      usuarioActualId &&
      String(usuarioActualId) === id
    ) {
      throw new BadRequestException(
        'No puede desactivar su propia cuenta de usuario',
      );
    }

    const actualizado = await this.usuariosRepo.actualizar(id, datos);
    if (!actualizado) {
      throw new NotFoundException('El usuario no existe');
    }
    return actualizado;
  }

  async actualizarPermisosRol(
    codigo: string,
    permisos: Permiso[],
  ): Promise<RolDocument> {
    if (codigo === 'directora' && !permisos.includes('usuarios.gestionar')) {
      throw new BadRequestException(
        'El rol de Directora no puede perder el permiso usuarios.gestionar',
      );
    }

    const rol = await this.rolesRepo.actualizarPermisos(codigo, permisos);
    if (!rol) {
      throw new NotFoundException(`El rol '${codigo}' no existe`);
    }
    return rol;
  }

  async obtenerUsuarioAutorizado(
    usuarioId: string,
  ): Promise<UsuarioAutorizado | null> {
    const usuario = await this.usuariosRepo.buscarActivoPorId(usuarioId);
    if (!usuario) return null;

    const rol = await this.rolesRepo.buscarPorCodigo(usuario.rol);
    if (!rol) return null;

    return {
      id: usuario._id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: rol.codigo,
      alcance: rol.alcance,
      permisos: rol.permisos,
      cursoIds: usuario.cursoIds,
    };
  }

  async obtenerUsuarioAutorizadoPorCorreo(
    correo: string,
  ): Promise<UsuarioAutorizado | null> {
    const usuario = await this.usuariosRepo.buscarPorCorreo(correo);
    if (!usuario || !usuario.activo) return null;

    const rol = await this.rolesRepo.buscarPorCodigo(usuario.rol);
    if (!rol) return null;

    return {
      id: usuario._id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: rol.codigo,
      alcance: rol.alcance,
      permisos: rol.permisos,
      cursoIds: usuario.cursoIds,
    };
  }

  async registrarUltimoAcceso(id: string, fecha: Date): Promise<void> {
    await this.usuariosRepo.registrarUltimoAcceso(id, fecha);
  }

}