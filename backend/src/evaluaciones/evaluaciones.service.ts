import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Area } from '../asignaturas/asignatura.schema';
import {
  NivelNormalizado,
  ResultadoEvaluacion,
} from './schemas/resultado-evaluacion.schema';
import {
  TipoEvaluacion,
  TipoEvaluacionDocument,
} from './schemas/tipo-evaluacion.schema';
import { TIPOS_EVALUACION_INICIALES } from './tipos-iniciales';

export interface DatosResultado {
  alumnoId: Types.ObjectId;
  tipoEvaluacionId: Types.ObjectId;
  cursoId: Types.ObjectId;
  anio: number;
  momento: string;
  area: Area;
  resultados: Record<string, unknown>;
  nivelNormalizado?: NivelNormalizado | null;
  cargaId?: Types.ObjectId | null;
}

@Injectable()
export class EvaluacionesService implements OnModuleInit {
  constructor(
    @InjectModel(TipoEvaluacion.name)
    private readonly tipoModel: Model<TipoEvaluacion>,
    @InjectModel(ResultadoEvaluacion.name)
    private readonly resultadoModel: Model<ResultadoEvaluacion>,
  ) {}

  // También en producción, donde no corre la semilla.
  async onModuleInit(): Promise<void> {
    await this.asegurarTiposIniciales();
  }

  /** Crea los tipos iniciales que no existan, sin pisar los ya editados. */
  async asegurarTiposIniciales(): Promise<number> {
    const resultado = await this.tipoModel.bulkWrite(
      TIPOS_EVALUACION_INICIALES.map((tipo) => ({
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

  /** Crea o actualiza el resultado por su clave única: recargar no duplica. */
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

  /**
   * Resultados del alumno con su instrumento, del año más reciente al más antiguo
   * y, dentro del año, en el orden de los momentos del instrumento.
   */
  async listarPorAlumno(alumnoId: Types.ObjectId) {
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
