import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ALCANCES, PERMISOS } from './permisos';
import type { Alcance, Permiso } from './permisos';

export type RolDocument = HydratedDocument<Rol>;

@Schema({
  collection: 'roles',
  timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
})
export class Rol {
  @Prop({ required: true, unique: true, trim: true })
  codigo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  /** 1 = Directora; sirve para ordenar los roles en la administración. */
  @Prop({ required: true, min: 1 })
  jerarquia: number;

  @Prop({ type: String, required: true, enum: ALCANCES })
  alcance: Alcance;

  @Prop({ type: [String], enum: PERMISOS, default: [] })
  permisos: Permiso[];
}

export const RolSchema = SchemaFactory.createForClass(Rol);
