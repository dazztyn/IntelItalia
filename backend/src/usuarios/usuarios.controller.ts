import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  RequierePermisos,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { ActualizarPermisosRolDto } from './dto/actualizar-permisos-rol.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { RolDocument } from './schemas/rol.schema';
import { UsuarioDocument } from './schemas/usuario.schema';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @RequierePermisos('usuarios.gestionar')
  listarUsuarios(): Promise<UsuarioDocument[]> {
    return this.usuariosService.listarUsuarios();
  }

  @Post()
  @RequierePermisos('usuarios.gestionar')
  crearUsuario(@Body() dto: CrearUsuarioDto): Promise<UsuarioDocument> {
    return this.usuariosService.registrarEnListaBlanca({
      correo: dto.correo,
      nombre: dto.nombre,
      rol: dto.rol,
      cursoIds: dto.cursoIds?.map((id) => new Types.ObjectId(id)),
      activo: dto.activo,
    });
  }

  @Patch(':id')
  @RequierePermisos('usuarios.gestionar')
  actualizarUsuario(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() usuarioActual?: UsuarioAutorizado,
  ): Promise<UsuarioDocument> {
    return this.usuariosService.actualizarUsuario(
      id,
      {
        nombre: dto.nombre,
        rol: dto.rol,
        cursoIds: dto.cursoIds?.map((cursoId) => new Types.ObjectId(cursoId)),
        activo: dto.activo,
      },
      usuarioActual?.id,
    );
  }

  @Get('roles')
  @RequierePermisos('usuarios.gestionar')
  listarRoles(): Promise<RolDocument[]> {
    return this.usuariosService.listarRoles();
  }

  @Patch('roles/:codigo/permisos')
  @RequierePermisos('usuarios.gestionar')
  actualizarPermisosRol(
    @Param('codigo') codigo: string,
    @Body() dto: ActualizarPermisosRolDto,
  ): Promise<RolDocument> {
    return this.usuariosService.actualizarPermisosRol(codigo, dto.permisos);
  }
}