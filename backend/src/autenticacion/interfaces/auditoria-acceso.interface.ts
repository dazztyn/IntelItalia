export const SERVICIO_AUDITORIA_ACCESO = 'SERVICIO_AUDITORIA_ACCESO';

export interface DatosAuditoriaAcceso 
{
  usuarioId: string | null;
  accion: 'inicioSesion' | 'accesoDenegado' | 'cierreSesion';
  ip: string;
  fecha: Date;
}

export interface ServicioAuditoriaAcceso 
{
  registrarEventoAcceso(datos: DatosAuditoriaAcceso): Promise<void>;
}