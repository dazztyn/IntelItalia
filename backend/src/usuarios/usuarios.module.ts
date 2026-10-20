import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { PermisosGuard } from './guards/permisos.guard';
import {
  RolesRepository,
} from './repositorios/roles.repository';
import {
  UsuariosRepository,
} from './repositorios/usuarios.repository';
import { Rol, RolSchema } from './schemas/rol.schema';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { MongooseUsuariosRepository } from './repositorios/mongoose-usuarios.repository';
import { MongooseRolesRepository } from './repositorios/mongoose-roles.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Rol.name, schema: RolSchema },
    ]),
  ],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    { provide: UsuariosRepository, useClass: MongooseUsuariosRepository },
    { provide: RolesRepository, useClass: MongooseRolesRepository },
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
  exports: [UsuariosService, UsuariosRepository, RolesRepository],
})
export class UsuariosModule {}