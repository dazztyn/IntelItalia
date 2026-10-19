import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UsuarioDocument = HydratedDocument<Usuario>;

// Lista blanca: sin documento aquí (y activo) no hay acceso a la plataforma.
@Schema({
  collection: 'usuarios',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class Usuario {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  /** Código del rol (`roles.codigo`), p. ej. "docente". */
  @Prop({ required: true })
  rol: string;

  /** Cursos asignados; se usan cuando el rol tiene `alcance: "cursosAsignados"`. */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Curso' }], default: [] })
  cursoIds: Types.ObjectId[];

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date, default: null })
  ultimoAcceso: Date | null;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
