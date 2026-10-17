import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Curso, CursoDocument } from './curso.schema';
import { NIVELES, Nivel } from './niveles';

export interface DatosCurso {
  anio: number;
  nivel: Nivel;
  letra?: string | null;
  asignaturaIds?: Types.ObjectId[];
}

export type ResultadoResolverCurso =
  | { estado: 'encontrado'; curso: CursoDocument }
  | { estado: 'noExiste' }
  | { estado: 'ambiguo'; cursos: CursoDocument[] };

@Injectable()
export class CursosService {
  constructor(
    @InjectModel(Curso.name) private readonly cursoModel: Model<Curso>,
  ) {}

  crear(datos: DatosCurso): Promise<CursoDocument> {
    return this.cursoModel.create(datos);
  }

  /** Cursos del año en orden de nivel (PK, K, 1° … 8°) y letra. */
  async listarPorAnio(anio: number): Promise<CursoDocument[]> {
    const cursos = await this.cursoModel.find({ anio }).exec();
    return cursos.sort(
      (a, b) =>
        NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel) ||
        (a.letra ?? '').localeCompare(b.letra ?? ''),
    );
  }

  buscarPorId(id: Types.ObjectId | string): Promise<CursoDocument | null> {
    return this.cursoModel.findById(id).exec();
  }

  /**
   * Resuelve el curso de una fila de archivo (docs/ARQUITECTURA.md, sección 3.2):
   * - si el nivel tiene un solo curso ese año, es ese, traiga o no letra el archivo
   *   (Letrapps y DIA escriben "3° Básico A" o "3 A" aunque la escuela no use letras);
   * - si tiene varios, la letra tiene que coincidir; si falta o no existe, es ambiguo.
   */
  async resolverCurso(
    anio: number,
    nivel: Nivel,
    letra?: string | null,
  ): Promise<ResultadoResolverCurso> {
    const cursos = await this.cursoModel.find({ anio, nivel }).exec();

    if (cursos.length === 0) return { estado: 'noExiste' };
    if (cursos.length === 1) return { estado: 'encontrado', curso: cursos[0] };

    const letraBuscada = letra?.trim().toUpperCase();
    const coincidencia = cursos.find((curso) => curso.letra === letraBuscada);
    return coincidencia
      ? { estado: 'encontrado', curso: coincidencia }
      : { estado: 'ambiguo', cursos };
  }
}
