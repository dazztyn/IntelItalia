import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AsignaturasService } from '../asignaturas/asignaturas.service';
import { CATALOGO_ASIGNATURAS } from '../asignaturas/catalogo';
import { CursoDocument } from './curso.schema';
import { NIVELES, Nivel, nombreCurso } from './niveles';
import { DatosCurso } from './interfaces/datos-curso.interface';
import { ResultadoResolverCurso } from './interfaces/resultado-resolver-curso.interface';
import { CursosRepository } from './repositorios/cursos.repository';

@Injectable()
export class CursosService {
  constructor(
    private readonly cursosRepo: CursosRepository,
    private readonly asignaturasService: AsignaturasService,
  ) {}

  async crear(datos: DatosCurso): Promise<CursoDocument> {
    return this.cursosRepo.crear({
      ...datos,
      asignaturaIds:
        datos.asignaturaIds ?? (await this.asignaturasDelNivel(datos.nivel)),
    });
  }

  async registrar(datos: DatosCurso): Promise<CursoDocument> {
    const letra = datos.letra?.trim().toUpperCase() || null;
    const nombre = `${nombreCurso(datos.nivel, letra)} en ${datos.anio}`;
    const existentes = await this.cursosRepo.buscarPorAnioYNivel(
      datos.anio,
      datos.nivel,
    );

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
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(`Ya existe ${nombre}`);
      }
      throw error;
    }
  }

  async prepararAnio(anio: number): Promise<number> {
    const conCurso = new Set(
      await this.cursosRepo.listarNivelesConCursoEnAnio(anio),
    );
    let creados = 0;
    for (const nivel of NIVELES) {
      if (conCurso.has(nivel)) continue;
      await this.crear({ anio, nivel });
      creados++;
    }
    return creados;
  }

  listarPorAnio(
    anio: number,
    cursoIds: Types.ObjectId[] | null = null,
  ): Promise<CursoDocument[]> {
    return this.cursosRepo.listarPorAnio(anio, cursoIds);
  }

  buscarPorId(id: Types.ObjectId | string): Promise<CursoDocument | null> {
    return this.cursosRepo.buscarPorId(id);
  }

  buscarPorIds(ids: Types.ObjectId[]): Promise<CursoDocument[]> {
    return this.cursosRepo.buscarPorIds(ids);
  }

  async resolverCurso(
    anio: number,
    nivel: Nivel,
    letra?: string | null,
  ): Promise<ResultadoResolverCurso> {
    const cursos = await this.cursosRepo.buscarPorAnioYNivel(anio, nivel);
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
    const codigos = CATALOGO_ASIGNATURAS.filter(({ niveles }) =>
      niveles.includes(nivel),
    ).map(({ codigo }) => codigo);

    const asignaturas = await this.asignaturasService.buscarPorCodigos(codigos);
    return asignaturas.map((asignatura) => asignatura._id);
  }
}
