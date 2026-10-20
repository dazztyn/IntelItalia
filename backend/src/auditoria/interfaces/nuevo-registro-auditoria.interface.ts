import { Types } from "mongoose";

export interface NuevoRegistroAuditoria 
{
  usuarioId?: Types.ObjectId | string | null;
  accion: string;
  recurso: string;
  recursoId?: string | null;
  alumnoId?: Types.ObjectId | string | null;
  ip: string;
  fecha?: Date;
}
