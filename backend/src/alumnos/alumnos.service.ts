import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { normalizarRut } from '../comun/rut';
import { claveNombre } from '../comun/texto';
import { AlumnoDocument, DatosPie } from './alumno.schema';
import { DatosAlumno } from './interfaces/datos-alumno.interface';
import { AlumnosRepository } from './repositorios/alumnos.repository';

@Injectable()
export class AlumnosService {
  constructor(private readonly alumnosRepo: AlumnosRepository) {}

  crear(datos: DatosAlumno): Promise<AlumnoDocument> {
    return this.alumnosRepo.crear(datos);
  }

  buscarPorId(id: Types.ObjectId): Promise<AlumnoDocument | null> {
    return this.alumnosRepo.buscarPorId(id);
  }

  buscarPorRut(rut: string): Promise<AlumnoDocument | null> {
    return this.alumnosRepo.buscarPorRut(normalizarRut(rut));
  }

  buscarPorIpe(ipe: string): Promise<AlumnoDocument | null> {
    return this.alumnosRepo.buscarPorIpe(ipe.trim().toUpperCase());
  }

  listarPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnosRepo.listarPorCurso(cursoId, anio);
  }

  listarTodosPorCurso(
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnosRepo.listarTodosPorCurso(cursoId, anio);
  }

  buscarPorNombreEnCurso(
    nombreCompleto: string,
    cursoId: Types.ObjectId,
    anio: number,
  ): Promise<AlumnoDocument[]> {
    return this.alumnosRepo.buscarPorNombreEnCurso(
      claveNombre(nombreCompleto),
      cursoId,
      anio,
    );
  }

  obtenerDatosPie(alumnoId: Types.ObjectId): Promise<DatosPie | undefined> {
    return this.alumnosRepo.obtenerDatosPie(alumnoId);
  }
}
