import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AliasNombre,
  AliasNombreDocument,
} from '../schemas/alias-nombre.schema';
import {
  AliasNombresRepository,
  DatosAliasNombre,
} from './alias-nombres.repository';

@Injectable()
export class MongooseAliasNombresRepository extends AliasNombresRepository {
  constructor(
    @InjectModel(AliasNombre.name)
    private readonly aliasModel: Model<AliasNombreDocument>,
  ) {
    super();
  }

  async listarPorFuenteYCurso(
    fuente: string,
    cursoId: Types.ObjectId,
  ): Promise<Map<string, string>> {
    const alias = await this.aliasModel.find({ fuente, cursoId }).exec();
    return new Map(
      alias.map(({ clave, alumnoId }) => [clave, String(alumnoId)]),
    );
  }

  async guardar({
    fuente,
    cursoId,
    clave,
    alumnoId,
    creadoPor,
  }: DatosAliasNombre): Promise<void> {
    await this.aliasModel
      .updateOne(
        { fuente, cursoId, clave },
        { $set: { alumnoId, creadoPor } },
        { upsert: true },
      )
      .exec();
  }
}
