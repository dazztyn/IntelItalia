import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';
import {
  RegistroAuditoria,
  RegistroAuditoriaDocument,
} from './schemas/registro-auditoria.schema';

export interface NuevoRegistroAuditoria {
  usuarioId?: Types.ObjectId | string | null;
  accion: string;
  recurso: string;
  recursoId?: string | null;
  alumnoId?: Types.ObjectId | string | null;
  ip: string;
  fecha?: Date;
}

export abstract class AuditoriaRepository {
  abstract registrar(datos: NuevoRegistroAuditoria): Promise<void>;
}

@Injectable()
export class MongooseAuditoriaRepository extends AuditoriaRepository {
  constructor(
    @InjectModel(RegistroAuditoria.name)
    private readonly modelo: Model<RegistroAuditoriaDocument>,
  ) {
    super();
  }

  async registrar(datos: NuevoRegistroAuditoria): Promise<void> {
    const usuarioId =
      datos.usuarioId && isObjectIdOrHexString(datos.usuarioId)
        ? new Types.ObjectId(String(datos.usuarioId))
        : null;

    const alumnoId =
      datos.alumnoId && isObjectIdOrHexString(datos.alumnoId)
        ? new Types.ObjectId(String(datos.alumnoId))
        : null;

    await this.modelo.create({
      usuarioId,
      accion: datos.accion,
      recurso: datos.recurso,
      recursoId: datos.recursoId ?? null,
      alumnoId,
      ip: datos.ip,
      fecha: datos.fecha ?? new Date(),
    });
  }
}