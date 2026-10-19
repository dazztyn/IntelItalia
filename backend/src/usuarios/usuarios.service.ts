import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';
import { Alcance, Permiso, PERMISOS, ROLES_INICIALES } from './permisos';
import { Rol } from './schemas/rol.schema';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

export interface DatosUsuario {
  correo: string;
  nombre: string;
  rol: string;
  cursoIds?: Types.ObjectId[];
  activo?: boolean;
}

/** Lo que el guard deja en `request.usuario` para filtrar por alcance en los servicios. */
export interface UsuarioAutorizado {
  id: Types.ObjectId;
  rol: string;
  alcance: Alcance;
  permisos: Permiso[];
  cursoIds: Types.ObjectId[];
}

@Injectable()
export class UsuariosService implements OnModuleInit {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Rol.name) private readonly rolModel: Model<Rol>,
  ) {}

  // También en producción, donde no corre la semilla: sin roles nadie podría entrar.
  async onModuleInit(): Promise<void> {
    await this.asegurarRolesIniciales();
  }

  /**
   * Crea los roles iniciales que no existan. Los existentes no se tocan, para no
   * pisar los permisos que la Directora haya editado. La excepción es la propia
   * Directora, que tiene acceso total: recibe los permisos nuevos del catálogo y
   * recupera los que se le hayan quitado.
   */
  async asegurarRolesIniciales(): Promise<number> {
    let creados = 0;
    for (const rol of ROLES_INICIALES) {
      if (await this.rolModel.exists({ codigo: rol.codigo })) continue;
      await this.rolModel.create(rol);
      creados++;
    }

    await this.rolModel.updateOne(
      { codigo: 'directora' },
      { $addToSet: { permisos: { $each: [...PERMISOS] } } },
    );
    return creados;
  }

  crear(datos: DatosUsuario): Promise<UsuarioDocument> {
    return this.usuarioModel.create(datos);
  }

  /**
   * Usuario activo con los permisos y el alcance de su rol, leídos en cada request
   * para que desactivarlo o cambiar sus permisos tenga efecto inmediato.
   * `null` si no existe, está inactivo o su rol no existe.
   */
  async obtenerUsuarioAutorizado(
    usuarioId: string,
  ): Promise<UsuarioAutorizado | null> {
    if (!isObjectIdOrHexString(usuarioId)) return null;

    const usuario = await this.usuarioModel
      .findOne({ _id: usuarioId, activo: true })
      .exec();
    if (!usuario) return null;

    const rol = await this.rolModel.findOne({ codigo: usuario.rol }).exec();
    if (!rol) return null;

    return {
      id: usuario._id,
      rol: rol.codigo,
      alcance: rol.alcance,
      permisos: rol.permisos,
      cursoIds: usuario.cursoIds,
    };
  }
}
