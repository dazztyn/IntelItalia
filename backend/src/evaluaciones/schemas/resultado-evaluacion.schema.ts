import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AREAS } from '../../asignaturas/asignatura.schema';
import type { Area } from '../../asignaturas/asignatura.schema';

export const NIVELES_NORMALIZADOS = ['bajo', 'medio', 'adecuado'] as const;
export type NivelNormalizado = (typeof NIVELES_NORMALIZADOS)[number];

export type ResultadoEvaluacionDocument = HydratedDocument<ResultadoEvaluacion>;

// Un resultado por alumno, instrumento, año, momento y área (sección 3.7).
@Schema({
  collection: 'resultadosEvaluacion',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class ResultadoEvaluacion {
  @Prop({ type: Types.ObjectId, ref: 'Alumno', required: true })
  alumnoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TipoEvaluacion', required: true })
  tipoEvaluacionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Curso', required: true })
  cursoId: Types.ObjectId;

  @Prop({ required: true, min: 2000, max: 2100 })
  anio: number;

  @Prop({ required: true })
  momento: string;

  @Prop({ type: String, required: true, enum: AREAS })
  area: Area;

  /** Resultado original, con la forma de `tiposEvaluacion.campos`. */
  @Prop({ type: SchemaTypes.Mixed, required: true })
  resultados: Record<string, unknown>;

  /** `null` mientras la escuela no defina el criterio de normalización. */
  @Prop({ type: String, enum: [...NIVELES_NORMALIZADOS, null], default: null })
  nivelNormalizado: NivelNormalizado | null;

  @Prop({ type: Date, default: null })
  fechaAplicacion: Date | null;

  /** Carga que originó el dato (trazabilidad). */
  @Prop({ type: Types.ObjectId, ref: 'Carga', default: null })
  cargaId: Types.ObjectId | null;
}

export const ResultadoEvaluacionSchema =
  SchemaFactory.createForClass(ResultadoEvaluacion);

// Volver a cargar el mismo archivo actualiza en vez de duplicar.
ResultadoEvaluacionSchema.index(
  { alumnoId: 1, tipoEvaluacionId: 1, anio: 1, momento: 1, area: 1 },
  { unique: true },
);
