import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { VariablesEntorno } from '../configuracion/validacion';
import { EXTRACTOR_SESION_HTTP } from '../usuarios/guards/permisos.guard';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './servicios/autenticacion.service';
import { SesionCookieService } from './servicios/sesion-cookie.service';
import {
  CLIENTE_OAUTH_GOOGLE,
  VerificadorGoogleService,
} from './servicios/verificador-google.service';

@Global()
@Module({
  imports: [
    UsuariosModule,
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
      provide: EXTRACTOR_SESION_HTTP,
      useExisting: SesionCookieService,
    },
  ],
  exports: [SesionCookieService, EXTRACTOR_SESION_HTTP],
})
export class AutenticacionModule {}