import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AREAS } from '../../asignaturas/asignatura.schema';
import type { Area } from '../../asignaturas/asignatura.schema';

export type TipoEvaluacionDocument = HydratedDocument<TipoEvaluacion>;

// Catálogo de instrumentos (docs/ARQUITECTURA.md, sección 3.6): cómo se lee y se
// normaliza cada uno. Agregar una evaluación nueva es crear un documento, no programar.
@Schema({
  collection: 'tiposEvaluacion',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class TipoEvaluacion {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  codigo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ type: [String], enum: AREAS, default: [] })
  areas: Area[];

  @Prop({ type: [String], default: [] })
  niveles: string[];

  @Prop({ type: [String], default: [] })
  momentos: string[];

  /** Forma de `resultados` según el instrumento (ver sección 3.6). */
  @Prop({ type: SchemaTypes.Mixed, default: [] })
  campos: unknown;

  /** Cómo se traduce a bajo | medio | adecuado (sección 4.3). */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  reglaNormalizacion: unknown;

  @Prop({ default: true })
  activo: boolean;
}

export const TipoEvaluacionSchema =
  SchemaFactory.createForClass(TipoEvaluacion);
