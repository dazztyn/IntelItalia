import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VariablesEntorno } from '../../configuracion/validacion';
import {
  DatosAuditoriaAcceso,
  ServicioAuditoriaAcceso,
} from '../interfaces/auditoria-acceso.interface';
import {
  ProveedorUsuarioSesion,
  UsuarioSesion,
} from '../interfaces/usuario-sesion.interface';

@Injectable()
export class ProveedorUsuarioProvisionalService
  implements ProveedorUsuarioSesion
{
  private readonly directoraInicial: UsuarioSesion | null;

  constructor(configuracion: ConfigService<VariablesEntorno, true>) {
    const correoDirectora = configuracion.get('CORREO_DIRECTORA_INICIAL', {
      infer: true,
    });

    this.directoraInicial = correoDirectora
      ? {
          id: 'directora-inicial-id',
          correo: correoDirectora.trim().toLowerCase(),
          nombre: 'Directora Inicial',
          rol: 'directora',
          activo: true,
          alcance: 'escuela',
          permisos: [
            'alumnos.ver',
            'alertas.ver',
            'alertas.gestionar',
            'cargas.notas',
            'cargas.asistencia',
            'cargas.evaluaciones',
            'observaciones.crear',
            'observaciones.verPsicosocial',
            'pie.ver',
            'simce.ver',
            'reportes.exportar',
            'reglasAlerta.gestionar',
            'usuarios.gestionar',
            'auditoria.ver',
          ],
          cursoIds: [],
        }
      : null;
  }

  async obtenerUsuarioPorId(id: string): Promise<UsuarioSesion | null> {
    if (this.directoraInicial && this.directoraInicial.id === id) {
      return this.directoraInicial;
    }
    return null;
  }

  async obtenerUsuarioPorCorreo(correo: string): Promise<UsuarioSesion | null> {
    if (
      this.directoraInicial &&
      this.directoraInicial.correo === correo.trim().toLowerCase()
    ) {
      return this.directoraInicial;
    }
    return null;
  }

  async registrarUltimoAcceso(_id: string, _fecha: Date): Promise<void> {
    // Se reemplazará por la actualización en la colección `usuarios` (MongoDB).
  }
}

@Injectable()
export class AuditoriaAccesoProvisionalService
  implements ServicioAuditoriaAcceso
{
  private readonly logger = new Logger('AuditoriaAcceso');

  async registrarEventoAcceso(datos: DatosAuditoriaAcceso): Promise<void> {
    this.logger.log(
      `Evento=${datos.accion} UsuarioId=${datos.usuarioId ?? 'anonimo'} IP=${datos.ip}`,
    );
  }
}