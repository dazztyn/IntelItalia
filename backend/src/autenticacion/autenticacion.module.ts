import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { VariablesEntorno } from '../configuracion/validacion';
import { AutenticacionController } from './autenticacion.controller';
import { SesionGuard } from './guards/sesion.guard';
import { SERVICIO_AUDITORIA_ACCESO } from './interfaces/auditoria-acceso.interface';
import { PROVEEDOR_USUARIO_SESION } from './interfaces/usuario-sesion.interface';
import { AutenticacionService } from './servicios/autenticacion.service';
import { SesionCookieService } from './servicios/sesion-cookie.service';
import {
  CLIENTE_OAUTH_GOOGLE,
  VerificadorGoogleService,
} from './servicios/verificador-google.service';
import { AuditoriaAccesoProvisionalService, ProveedorUsuarioProvisionalService } from './servicios/adaptadores-provisionales.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) => ({
        secret: configuracion.get('JWT_SECRETO', { infer: true }),
        signOptions: {
          expiresIn: configuracion.get('JWT_DURACION_SEGUNDOS', {
            infer: true,
          }),
        },
      }),
    }),
  ],
  controllers: [AutenticacionController],
  providers: [
    AutenticacionService,
    VerificadorGoogleService,
    SesionCookieService,
    {
      provide: CLIENTE_OAUTH_GOOGLE,
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService<VariablesEntorno, true>) =>
        new OAuth2Client(
          configuracion.get('GOOGLE_CLIENT_ID', { infer: true }),
        ),
    },
    {
      provide: PROVEEDOR_USUARIO_SESION,
      useClass: ProveedorUsuarioProvisionalService,
    },
    {
      provide: SERVICIO_AUDITORIA_ACCESO,
      useClass: AuditoriaAccesoProvisionalService,
    },
    {
      provide: APP_GUARD,
      useClass: SesionGuard,
    },
  ],
  exports: [SesionCookieService, PROVEEDOR_USUARIO_SESION],
})
export class AutenticacionModule {}