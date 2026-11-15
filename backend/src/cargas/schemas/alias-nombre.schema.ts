import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AliasNombreDocument = HydratedDocument<AliasNombre>;

// Lo que el usuario resolvió en la vista previa de una carga (sección 6.2): "este
// nombre del archivo es este alumno". Así la carga siguiente no vuelve a preguntar.
// Guarda la clave normalizada del nombre (comun/texto.ts), no el texto del archivo.
@Schema({
  collection: 'aliasNombres',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class AliasNombre {
  @Prop({ required: true })
  fuente: string;

  /** Por curso: un alias de 3° no identifica a un alumno de otro curso. */
  @Prop({ type: Types.ObjectId, ref: 'Curso', required: true })
  cursoId: Types.ObjectId;

  @Prop({ required: true })
  clave: string;

  @Prop({ type: Types.ObjectId, ref: 'Alumno', required: true })
  alumnoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  creadoPor: Types.ObjectId;
}

export const AliasNombreSchema = SchemaFactory.createForClass(AliasNombre);

AliasNombreSchema.index({ fuente: 1, cursoId: 1, clave: 1 }, { unique: true });
