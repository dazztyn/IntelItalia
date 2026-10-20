import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RegistroAuditoriaDocument = HydratedDocument<RegistroAuditoria>;

@Schema({
  collection: 'registroAuditoria',
  versionKey: false,
})
export class RegistroAuditoria {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', default: null })
  usuarioId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  accion: string;

  @Prop({ required: true, trim: true })
  recurso: string;

  @Prop({ type: String, default: null })
  recursoId: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Alumno', default: null })
  alumnoId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  ip: string;

  @Prop({ type: Date, default: () => new Date() })
  fecha: Date;
}

export const RegistroAuditoriaSchema =
  SchemaFactory.createForClass(RegistroAuditoria);

RegistroAuditoriaSchema.index({ fecha: -1 });
RegistroAuditoriaSchema.index({ usuarioId: 1, fecha: -1 });
RegistroAuditoriaSchema.index({ alumnoId: 1, fecha: -1 });