import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { normalizarTexto } from '../comun/texto';

export const AREAS = ['lenguaje', 'matematica', 'otra'] as const;
export type Area = (typeof AREAS)[number];

export type AsignaturaDocument = HydratedDocument<Asignatura>;

// Toda la lógica por área (alertas "solo Lenguaje", "solo Matemática") usa `area`,
// nunca el nombre de la asignatura.
@Schema({
  collection: 'asignaturas',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class Asignatura {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  codigo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ type: String, required: true, enum: AREAS })
  area: Area;

  /** Otros nombres con que aparece en los archivos ("Lenguaje", "Lengua y Literatura"). */
  @Prop({ type: [String], default: [] })
  aliases: string[];

  /** Calculado: nombre y aliases normalizados, para reconocer la asignatura al cargar. */
  @Prop({ type: [String], default: [] })
  nombresNormalizados: string[];
}

export const AsignaturaSchema = SchemaFactory.createForClass(Asignatura);

AsignaturaSchema.index({ nombresNormalizados: 1 });

AsignaturaSchema.pre('validate', function () {
  this.nombresNormalizados = [
    ...new Set([this.nombre, ...this.aliases].map(normalizarTexto)),
  ];
});
