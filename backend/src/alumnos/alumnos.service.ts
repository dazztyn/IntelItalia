import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizarRut } from '../comun/rut';
import { claveNombre } from '../comun/texto';
import {
  Alumno,
  AlumnoDocument,
  DatosPie
} from './alumno.schema';
import { DatosAlumno } from './interfaces/datos-alumno.interface';

@Injectable()
export class AlumnosService {
  constructor(
    @InjectModel(Alumno.name) private readonly alumnoModel: Model<Alumno>,
  ) {}

  /** Crea el alumno; el esquema valida el RUT y calcula el nombre normalizado. */
  crear(datos: DatosAlumno): Promise<AlumnoDocument> {
    return this.alumnoModel.create(datos);
  }

  buscarPorRut(rut: string): Promise<AlumnoDocument | null> {
    return this.alumnoModel.findOne({ rut: normalizarRut(rut) }).exec();
  }

  buscarPorIpe(ipe: string): Promise<AlumnoDocument | null> {
    return this.alumnoModel.findOne({ ipe: ipe.trim().toUpperCase() }).exec();
  }

  /** Alumnos con matrícula activa en el curso ese año, por apellido. */
  listarPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnoModel
      .find({ matriculas: { $elemMatch: { cursoId, anio, estado: 'activa' } } })
      .sort({ apellidoPaterno: 1, apellidoMaterno: 1, nombres: 1 })
      .exec();
  }

  /**
   * Busca por nombre entre los matriculados del curso, como hacen los importadores
   * de Letrapps y DIA (docs/ARQUITECTURA.md, sección 6.2). Puede devolver 0, 1 o
   * varios candidatos: si no hay exactamente uno, la fila se resuelve en la vista previa.
   */
  buscarPorNombreEnCurso(
    nombreCompleto: string,
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnoModel
      .find({
        nombreNormalizado: claveNombre(nombreCompleto),
        matriculas: { $elemMatch: { cursoId, anio } },
      })
      .exec();
  }

  /** Datos PIE (sensibles). Solo se llama desde endpoints con el permiso `pie.ver`. */
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
