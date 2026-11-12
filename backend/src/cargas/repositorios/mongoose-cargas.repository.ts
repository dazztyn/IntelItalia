import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Carga, CargaDocument } from '../schemas/carga.schema';
import { DatosCrearCarga } from '../interfaces/datos-crear-carga.interface';
import { CargasRepository } from './cargas.repository';

@Injectable()
export class MongooseCargasRepository extends CargasRepository {
  constructor(
    @InjectModel(Carga.name) private readonly cargaModel: Model<CargaDocument>,
  ) {
    super();
  }

  crear(datos: DatosCrearCarga): Promise<CargaDocument> {
    return this.cargaModel.create(datos);
  }

  listarRecientes(limite: number = 50): Promise<CargaDocument[]> {
    return this.cargaModel.find().sort({ iniciadaEn: -1 }).limit(limite).exec();
  }

  buscarPorId(id: Types.ObjectId): Promise<CargaDocument | null> {
    return this.cargaModel.findById(id).exec();
  }
}
