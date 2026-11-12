import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AsignaturasService } from '../asignaturas/asignaturas.service';
import { CATALOGO_ASIGNATURAS } from '../asignaturas/catalogo';
import { Curso, CursoDocument } from './curso.schema';
import { NIVELES, Nivel, nombreCurso } from './niveles';
import { DatosCurso } from './interfaces/datos-curso.interface';
import { ResultadoResolverCurso } from './interfaces/resultado-resolver-curso.interface';

@Injectable()
export class CursosService {
  constructor(
    @InjectModel(Curso.name) private readonly cursoModel: Model<Curso>,
    private readonly asignaturasService: AsignaturasService,
  ) {}

  /** Sin `asignaturaIds`, el curso recibe las del catálogo para su nivel. */
  async crear(datos: DatosCurso): Promise<CursoDocument> {
    return this.cursoModel.create({
      ...datos,
      asignaturaIds:
        datos.asignaturaIds ?? (await this.asignaturasDelNivel(datos.nivel)),
    });
  }

  /**
   * Crea un curso a pedido de la Directora (POST /api/cursos). En un nivel y año
   * no se mezclan cursos con y sin letra: `resolverCurso` no sabría a cuál va
   * una fila de un archivo.
   */
  async registrar(datos: DatosCurso): Promise<CursoDocument> {
    const letra = datos.letra?.trim().toUpperCase() || null;
    const nombre = `${nombreCurso(datos.nivel, letra)} en ${datos.anio}`;
    const existentes = await this.cursoModel
      .find({ anio: datos.anio, nivel: datos.nivel })
      .exec();

    if (existentes.some((curso) => curso.letra === letra)) {
      throw new ConflictException(`Ya existe ${nombre}`);
    }
    if (existentes.some((curso) => !curso.letra !== !letra)) {
      throw new ConflictException(
        `No se puede crear ${nombre}: en un nivel, los cursos del año van todos con letra o uno solo sin letra`,
      );
    }

    try {
      return await this.crear({ ...datos, letra });
    } catch (error) {
      // Dos peticiones a la vez: el índice único detiene la segunda.
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(`Ya existe ${nombre}`);
      }
      throw error;
    }
  }

  /** Crea, sin letra, el curso de cada nivel (PK a 8°) que no tenga ninguno ese año. */
  async prepararAnio(anio: number): Promise<number> {
    const conCurso = new Set(
      await this.cursoModel.distinct('nivel', { anio }).exec(),
    );
    let creados = 0;
    for (const nivel of NIVELES) {
      if (conCurso.has(nivel)) continue;
      await this.crear({ anio, nivel });
      creados++;
    }
    return creados;
  }

  /**
   * Cursos del año en orden de nivel (PK, K, 1° … 8°) y letra. Con `cursoIds`
   * (alcance `cursosAsignados`, ver usuarios/alcance.ts) solo devuelve esos.
   */
  async listarPorAnio(
    anio: number,
    cursoIds: Types.ObjectId[] | null = null,
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

  /**
   * Resuelve el curso de una fila de archivo (docs/ARQUITECTURA.md, sección 3.2):
   * - si el nivel tiene un solo curso sin letra, es ese, traiga o no letra el archivo
   *   (Letrapps y DIA escriben "3° Básico A" o "3 A" aunque la escuela no use letras);
   * - si el único curso tiene letra, el archivo no puede traer otra (5° B ≠ 5° A);
   * - si tiene varios, la letra tiene que coincidir; si falta o no existe, es ambiguo.
   */
  async resolverCurso(
    anio: number,
    nivel: Nivel,
    letra?: string | null,
  ): Promise<ResultadoResolverCurso> {
    const cursos = await this.cursoModel.find({ anio, nivel }).exec();
    const letraBuscada = letra?.trim().toUpperCase() || null;

    if (cursos.length === 0) return { estado: 'noExiste' };
    if (cursos.length === 1) {
      const [curso] = cursos;
      return curso.letra && letraBuscada && curso.letra !== letraBuscada
        ? { estado: 'noExiste' }
        : { estado: 'encontrado', curso };
    }

    const coincidencia = cursos.find((curso) => curso.letra === letraBuscada);
    return coincidencia
      ? { estado: 'encontrado', curso: coincidencia }
      : { estado: 'ambiguo', cursos };
  }

  private async asignaturasDelNivel(nivel: Nivel): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    for (const { codigo, niveles } of CATALOGO_ASIGNATURAS) {
      if (!niveles.includes(nivel)) continue;
      const asignatura = await this.asignaturasService.buscarPorCodigo(codigo);
      if (asignatura) ids.push(asignatura._id);
    }
    return ids;
  }
}
