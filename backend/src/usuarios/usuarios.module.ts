import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { PermisosGuard } from './permisos.guard';
import { Rol, RolSchema } from './schemas/rol.schema';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { UsuariosService } from './usuarios.service';

// Sin controlador todavía: la administración de usuarios y roles llega con PGT-51.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Rol.name, schema: RolSchema },
    ]),
  ],
  providers: [UsuariosService, { provide: APP_GUARD, useClass: PermisosGuard }],
  exports: [UsuariosService],
})
export class UsuariosModule {}
