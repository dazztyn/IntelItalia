import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TipoEvaluacion,
  TipoEvaluacionDocument,
} from '../schemas/tipo-evaluacion.schema';
import {
  ResultadoEvaluacion,
  ResultadoEvaluacionDocument,
} from '../schemas/resultado-evaluacion.schema';
import { DatosResultado } from '../interfaces/datos-resultado.interface';
import { EvaluacionesRepository } from './evaluaciones.repository';
import { ResultadoEvaluacionPopulado } from '../interfaces/resultado-evaluacion-populado.interface';

@Injectable()
export class MongooseEvaluacionesRepository extends EvaluacionesRepository {
  constructor(
    @InjectModel(TipoEvaluacion.name)
    private readonly tipoModel: Model<TipoEvaluacionDocument>,
    @InjectModel(ResultadoEvaluacion.name)
    private readonly resultadoModel: Model<ResultadoEvaluacionDocument>,
  ) {
    super();
  }

  async asegurarTiposIniciales(tipos: TipoEvaluacion[]): Promise<number> {
    const resultado = await this.tipoModel.bulkWrite(
      tipos.map((tipo) => ({
        updateOne: {
          filter: { codigo: tipo.codigo },
          update: { $setOnInsert: tipo },
          upsert: true,
        },
      })),
    );
    return resultado.upsertedCount;
  }

  buscarTipoPorCodigo(codigo: string): Promise<TipoEvaluacionDocument | null> {
    return this.tipoModel.findOne({ codigo: codigo.toUpperCase() }).exec();
  }

  async guardarResultado(datos: DatosResultado): Promise<void> {
    const { alumnoId, tipoEvaluacionId, anio, momento, area, ...resto } = datos;
    await this.resultadoModel
      .updateOne(
        { alumnoId, tipoEvaluacionId, anio, momento, area },
        { $set: resto },
        { upsert: true, runValidators: true },
      )
      .exec();
  }

  async listarPorAlumno(
    alumnoId: Types.ObjectId,
  ): Promise<ResultadoEvaluacionPopulado[]> {
    const resultados = await this.resultadoModel
      .find({ alumnoId })
      .populate<{
        tipoEvaluacionId: Pick<
          TipoEvaluacion,
          'codigo' | 'nombre' | 'momentos'
        >;
      }>('tipoEvaluacionId', 'codigo nombre momentos')
      .exec();

    const orden = (r: (typeof resultados)[number]) =>
      r.tipoEvaluacionId.momentos.indexOf(r.momento);

    return resultados.sort(
      (a, b) =>
        b.anio - a.anio ||
        a.tipoEvaluacionId.codigo.localeCompare(b.tipoEvaluacionId.codigo) ||
        orden(a) - orden(b) ||
        a.area.localeCompare(b.area),
    );
  }
}
