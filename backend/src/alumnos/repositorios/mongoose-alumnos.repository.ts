import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alumno, AlumnoDocument, DatosPie } from '../alumno.schema';
import { DatosAlumno } from '../interfaces/datos-alumno.interface';
import { AlumnosRepository } from './alumnos.repository';

@Injectable()
export class MongooseAlumnosRepository extends AlumnosRepository {
  constructor(
    @InjectModel(Alumno.name)
    private readonly alumnoModel: Model<AlumnoDocument>,
  ) {
    super();
  }

  crear(datos: DatosAlumno): Promise<AlumnoDocument> {
    return this.alumnoModel.create(datos);
  }

  buscarPorId(id: Types.ObjectId): Promise<AlumnoDocument | null> {
    return this.alumnoModel.findById(id).exec();
  }

  buscarPorRut(rutNormalizado: string): Promise<AlumnoDocument | null> {
    return this.alumnoModel.findOne({ rut: rutNormalizado }).exec();
  }

  buscarPorIpe(ipe: string): Promise<AlumnoDocument | null> {
    return this.alumnoModel.findOne({ ipe }).exec();
  }

  listarPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnoModel
      .find({ matriculas: { $elemMatch: { cursoId, anio, estado: 'activa' } } })
      .sort({ apellidoPaterno: 1, apellidoMaterno: 1, nombres: 1 })
      .exec();
  }

  listarTodosPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnoModel
      .find({ matriculas: { $elemMatch: { cursoId, anio } } })
      .sort({ apellidoPaterno: 1, apellidoMaterno: 1, nombres: 1 })
      .exec();
  }

  buscarPorNombreEnCurso(
    claveNombre: string,
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnoModel
      .find({
        nombreNormalizado: claveNombre,
        matriculas: { $elemMatch: { cursoId, anio } },
      })
      .exec();
  }

  async obtenerDatosPie(
    alumnoId: Types.ObjectId,
  ): Promise<DatosPie | undefined> {
    const alumno = await this.alumnoModel
      .findById(alumnoId)
      .select('+pie')
      .exec();
    return alumno?.pie;
  }
}
