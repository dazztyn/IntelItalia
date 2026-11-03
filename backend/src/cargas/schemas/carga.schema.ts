import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const FUENTES_CARGA = ['dia'] as const; // ⏳ miAulaNotas, miAulaAsistencia, letrapps, sepa
export type FuenteCarga = (typeof FUENTES_CARGA)[number];

export const ESTADOS_CARGA = [
  'completada',
  'completadaConErrores',
  'fallida',
] as const;
export type EstadoCarga = (typeof ESTADOS_CARGA)[number];

@Schema({ _id: false })
export class ErrorFila {
  @Prop({ required: true })
  fila: number;

  @Prop({ required: true })
  campo: string;

  /** Sin nombres ni RUT: el informe identifica la fila por su número. */
  @Prop({ required: true })
  mensaje: string;
}
export const ErrorFilaSchema = SchemaFactory.createForClass(ErrorFila);

export type CargaDocument = HydratedDocument<Carga>;

// Registro de cada archivo cargado (sección 3.10). El archivo en sí no se guarda.
@Schema({ collection: 'cargas', versionKey: false })
export class Carga {
  @Prop({ type: String, required: true, enum: FUENTES_CARGA })
  fuente: FuenteCarga;

  @Prop({ required: true, trim: true })
  nombreArchivo: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  usuarioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Curso', required: true })
  cursoId: Types.ObjectId;

  @Prop({ required: true, min: 2000, max: 2100 })
  anio: number;

  @Prop({ required: true })
  momento: string;

  @Prop({ required: true })
  area: string;

  @Prop({ type: String, required: true, enum: ESTADOS_CARGA })
  estado: EstadoCarga;

  @Prop({ required: true, min: 0 })
  filasTotales: number;

  @Prop({ required: true, min: 0 })
  filasOk: number;

  @Prop({ type: [ErrorFilaSchema], default: [] })
  errores: ErrorFila[];

  @Prop({ type: Date, required: true })
  iniciadaEn: Date;

  @Prop({ type: Date, required: true })
  finalizadaEn: Date;
}

export const CargaSchema = SchemaFactory.createForClass(Carga);

CargaSchema.index({ iniciadaEn: -1 });
