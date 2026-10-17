import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NIVELES, nombreCurso } from './niveles';
import type { Nivel } from './niveles';

export type CursoDocument = HydratedDocument<Curso>;

// Un documento por curso y año. Hoy hay un curso por nivel (letra: null); si la
// escuela pasa a tener 3° A y 3° B, se crean dos documentos sin cambiar el esquema.
@Schema({
  collection: 'cursos',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class Curso {
  @Prop({ required: true, min: 2000, max: 2100 })
  anio: number;

  @Prop({ type: String, required: true, enum: NIVELES })
  nivel: Nivel;

  @Prop({ type: String, default: null, match: /^[A-Z]$/ })
  letra: string | null;

  /** Calculado a partir de nivel y letra; no se edita a mano. */
  @Prop({ required: true })
  nombre: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Asignatura' }], default: [] })
  asignaturaIds: Types.ObjectId[];
}

export const CursoSchema = SchemaFactory.createForClass(Curso);

CursoSchema.index({ anio: 1, nivel: 1, letra: 1 }, { unique: true });

CursoSchema.pre('validate', function () {
  if (this.letra) this.letra = this.letra.trim().toUpperCase();
  this.nombre = nombreCurso(this.nivel, this.letra);
});
