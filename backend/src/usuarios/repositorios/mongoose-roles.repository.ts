import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permiso, PERMISOS, RolInicial } from '../permisos';
import { Rol, RolDocument } from '../schemas/rol.schema';
import { RolesRepository } from './roles.repository';

@Injectable()
export class MongooseRolesRepository extends RolesRepository {
  constructor(
    @InjectModel(Rol.name) private readonly rolModel: Model<RolDocument>,
  ) {
    super();
  }

  async asegurarRolesIniciales(roles: readonly RolInicial[]): Promise<number> {
    const operaciones = roles.map((rol) => ({
      updateOne: {
        filter: { codigo: rol.codigo },
        update: { $setOnInsert: rol },
        upsert: true,
      },
    }));

    const resultado = await this.rolModel.bulkWrite(operaciones);

    await this.rolModel.updateOne(
      { codigo: 'directora' },
      { $addToSet: { permisos: { $each: [...PERMISOS] } } },
    );

    return resultado.upsertedCount;
  }

  buscarPorCodigo(codigo: string): Promise<RolDocument | null> {
    return this.rolModel.findOne({ codigo }).exec();
  }

  listarTodos(): Promise<RolDocument[]> {
    return this.rolModel.find().sort({ jerarquia: 1 }).exec();
  }

  actualizarPermisos(
    codigo: string,
    permisos: Permiso[],
  ): Promise<RolDocument | null> {
    return this.rolModel
      .findOneAndUpdate({ codigo }, { $set: { permisos } }, { new: true })
      .exec();
  }
}