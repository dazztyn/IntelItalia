import { Types } from 'mongoose';

export interface DatosCrearUsuario {
  correo: string;
  nombre: string;
  rol: string;
  cursoIds?: Types.ObjectId[];
  activo?: boolean;
}

export interface DatosActualizarUsuario {
  nombre?: string;
  rol?: string;
  cursoIds?: Types.ObjectId[];
  activo?: boolean;
}