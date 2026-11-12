export type EstadoServicio = 'arriba' | 'abajo';

export interface EstadoSalud {
  estado: 'ok' | 'degradado';
  mongo: EstadoServicio;
  redis: EstadoServicio;
}
