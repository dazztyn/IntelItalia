import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Area, Asignatura, AsignaturaDocument } from '../asignatura.schema';
import { AsignaturaCatalogo } from '../interfaces/asignatura-catalogo.interface';
import { AsignaturasRepository } from './asignaturas.repository';

@Injectable()
export class MongooseAsignaturasRepository extends AsignaturasRepository {
  constructor(
    @InjectModel(Asignatura.name)
    private readonly asignaturaModel: Model<AsignaturaDocument>,
  ) {
    super();
  }

  listar(): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel.find().sort({ codigo: 1 }).exec();
  }

  listarPorArea(area: Area): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel.find({ area }).sort({ codigo: 1 }).exec();
  }

  buscarPorCodigo(codigo: string): Promise<AsignaturaDocument | null> {
    return this.asignaturaModel
      .findOne({ codigo: codigo.trim().toUpperCase() })
      .exec();
  }

  buscarPorCodigos(codigos: string[]): Promise<AsignaturaDocument[]> {
    const normalizados = codigos.map((c) => c.trim().toUpperCase());
    return this.asignaturaModel.find({ codigo: { $in: normalizados } }).exec();
  }

  buscarPorNombre(
    nombreNormalizado: string,
    entreIds?: Types.ObjectId[],
  ): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel
      .find({
        nombresNormalizados: nombreNormalizado,
        ...(entreIds ? { _id: { $in: entreIds } } : {}),
      })
      .exec();
  }

  async asegurarCatalogo(catalogo: AsignaturaCatalogo[]): Promise<number> {
    const operaciones = catalogo.map((asignatura) => ({
      updateOne: {
        filter: { codigo: asignatura.codigo },
        update: { $setOnInsert: asignatura },
        upsert: true,
      },
    }));

    const resultado = await this.asignaturaModel.bulkWrite(operaciones);
    return resultado.upsertedCount;
  }
}
