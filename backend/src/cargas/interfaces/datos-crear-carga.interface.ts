import { Types } from 'mongoose';
import { EstadoCarga, ErrorFila, FuenteCarga } from '../schemas/carga.schema';

export interface DatosCrearCarga {
  _id?: Types.ObjectId;
  fuente: FuenteCarga;
  nombreArchivo: string;
  usuarioId: Types.ObjectId;
  cursoId: Types.ObjectId;
  anio: number;
  momento: string;
  area: string;
  estado: EstadoCarga;
  filasTotales: number;
  filasOk: number;
  errores: ErrorFila[];
  iniciadaEn: Date;
  finalizadaEn: Date;
}
