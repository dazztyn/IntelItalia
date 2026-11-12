import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Curso, CursoDocument } from '../curso.schema';
import { DatosCurso } from '../interfaces/datos-curso.interface';
import { NIVELES, Nivel } from '../niveles';
import { CursosRepository } from './cursos.repository';

@Injectable()
export class MongooseCursosRepository extends CursosRepository {
  constructor(
    @InjectModel(Curso.name) private readonly cursoModel: Model<CursoDocument>,
  ) {
    super();
  }

  crear(datos: DatosCurso & { letra?: string | null }): Promise<CursoDocument> {
    return this.cursoModel.create(datos);
  }

  async listarPorAnio(
    anio: number,
    cursoIds: Types.ObjectId[] | null,
  ): Promise<CursoDocument[]> {
    const cursos = await this.cursoModel
      .find({ anio, ...(cursoIds ? { _id: { $in: cursoIds } } : {}) })
      .exec();

    return cursos.sort(
      (a, b) =>
        NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel) ||
        (a.letra ?? '').localeCompare(b.letra ?? ''),
    );
  }

  buscarPorId(id: Types.ObjectId | string): Promise<CursoDocument | null> {
    return this.cursoModel.findById(id).exec();
  }

  buscarPorIds(ids: Types.ObjectId[]): Promise<CursoDocument[]> {
    return this.cursoModel.find({ _id: { $in: ids } }).exec();
  }

  buscarPorAnioYNivel(anio: number, nivel: Nivel): Promise<CursoDocument[]> {
    return this.cursoModel.find({ anio, nivel }).exec();
  }

  async listarNivelesConCursoEnAnio(anio: number): Promise<Nivel[]> {
    return this.cursoModel.distinct('nivel', { anio }).exec();
  }
}
