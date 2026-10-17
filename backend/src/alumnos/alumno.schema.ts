import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { esRutValido, normalizarRut } from '../comun/rut';
import { claveNombre } from '../comun/texto';

export const ESTADOS_MATRICULA = ['activa', 'retirada', 'trasladada'] as const;
export type EstadoMatricula = (typeof ESTADOS_MATRICULA)[number];

export const TIPOS_NEE = ['transitoria', 'permanente'] as const;
export type TipoNee = (typeof TIPOS_NEE)[number];

@Schema({ _id: false })
export class Matricula {
  @Prop({ required: true, min: 2000, max: 2100 })
  anio: number;

  @Prop({ type: Types.ObjectId, ref: 'Curso', required: true })
  cursoId: Types.ObjectId;

  @Prop({ type: String, enum: ESTADOS_MATRICULA, default: 'activa' })
  estado: EstadoMatricula;
}
export const MatriculaSchema = SchemaFactory.createForClass(Matricula);

// ⚠️ Dato sensible (Ley 21.719): solo para roles con el permiso `pie.ver`.
// No se importan diagnósticos detallados, solo si participa y el tipo de NEE.
@Schema({ _id: false })
export class DatosPie {
  @Prop({ default: false })
  participa: boolean;

  @Prop({ type: String, enum: [...TIPOS_NEE, null], default: null })
  tipoNee: TipoNee | null;
}
export const DatosPieSchema = SchemaFactory.createForClass(DatosPie);

export type AlumnoDocument = HydratedDocument<Alumno>;

@Schema({
  collection: 'alumnos',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class Alumno {
  /** Normalizado ("12345678-5") y validado con módulo 11. */
  @Prop({ type: String, default: null })
  rut: string | null;

  /** Identificador Provisorio Escolar, para alumnos sin RUT. */
  @Prop({ type: String, default: null, uppercase: true, trim: true })
  ipe: string | null;

  @Prop({ required: true, trim: true })
  nombres: string;

  @Prop({ required: true, trim: true })
  apellidoPaterno: string;

  @Prop({ type: String, default: null, trim: true })
  apellidoMaterno: string | null;

  /**
   * Calculado: palabras del nombre completo sin tildes, en mayúsculas y ordenadas.
   * Identifica al alumno en Letrapps y DIA, que no traen RUT.
   */
  @Prop({ required: true })
  nombreNormalizado: string;

  /** ⏳ Solo si Mi Aula la exporta y se usa; si no, se elimina (minimización). */
  @Prop({ type: Date, default: null })
  fechaNacimiento: Date | null;

  /** Una matrícula por año, con el historial de años anteriores. */
  @Prop({ type: [MatriculaSchema], default: [] })
  matriculas: Matricula[];

  /** Oculto en todas las consultas salvo que se pida con `.select('+pie')`. */
  @Prop({ type: DatosPieSchema, select: false })
  pie?: DatosPie;
}

export const AlumnoSchema = SchemaFactory.createForClass(Alumno);

const SOLO_TEXTO = { $type: 'string' };
AlumnoSchema.index(
  { rut: 1 },
  { unique: true, partialFilterExpression: { rut: SOLO_TEXTO } },
);
AlumnoSchema.index(
  { ipe: 1 },
  { unique: true, partialFilterExpression: { ipe: SOLO_TEXTO } },
);
AlumnoSchema.index({ 'matriculas.anio': 1, 'matriculas.cursoId': 1 });
AlumnoSchema.index({ nombreNormalizado: 1 });

AlumnoSchema.pre('validate', function () {
  if (this.rut) {
    this.rut = normalizarRut(this.rut);
    if (!esRutValido(this.rut)) {
      this.invalidate('rut', 'El RUT no es válido (dígito verificador).');
    }
  }
  if (!this.rut && !this.ipe) {
    this.invalidate('rut', 'El alumno necesita un RUT o un IPE.');
  }

  const anios = this.matriculas
    .filter((matricula) => matricula.estado === 'activa')
    .map((matricula) => matricula.anio);
  if (new Set(anios).size !== anios.length) {
    this.invalidate(
      'matriculas',
      'El alumno no puede tener dos matrículas activas el mismo año.',
    );
  }

  this.nombreNormalizado = claveNombre(
    this.nombres,
    this.apellidoPaterno,
    this.apellidoMaterno,
  );
});
