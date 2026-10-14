import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import { AsignaturasService } from '../asignaturas/asignaturas.service';
import { CATALOGO_ASIGNATURAS } from '../asignaturas/catalogo';
import { CursosService } from '../cursos/cursos.service';
import { NIVELES } from '../cursos/niveles';
import { generarAlumnosFicticios } from './datos-ficticios';

export const ALUMNOS_POR_CURSO = 20;

export interface ResumenSemilla {
  asignaturasCreadas: number;
  cursosCreados: number;
  alumnosCreados: number;
}

@Injectable()
export class SemillaService {
  constructor(
    private readonly asignaturasService: AsignaturasService,
    private readonly cursosService: CursosService,
    private readonly alumnosService: AlumnosService,
  ) {}

  /**
   * Carga el catálogo de asignaturas, un curso por nivel (PK a 8°) para el año y
   * alumnos ficticios en cada curso. Se puede correr varias veces: lo que ya
   * existe no se duplica ni se modifica.
   */
  async ejecutar(anio: number): Promise<ResumenSemilla> {
    const resumen: ResumenSemilla = {
      asignaturasCreadas: await this.asignaturasService.asegurarCatalogo(),
      cursosCreados: 0,
      alumnosCreados: 0,
    };

    for (const [indice, nivel] of NIVELES.entries()) {
      let curso = await this.buscarCurso(anio, nivel);
      if (!curso) {
        curso = await this.cursosService.crear({
          anio,
          nivel,
          asignaturaIds: await this.asignaturasDelNivel(nivel),
        });
        resumen.cursosCreados++;
      }

      for (const alumno of generarAlumnosFicticios(indice, ALUMNOS_POR_CURSO)) {
        const existente = alumno.rut
          ? await this.alumnosService.buscarPorRut(alumno.rut)
          : await this.alumnosService.buscarPorIpe(alumno.ipe as string);
        if (existente) continue;

        await this.alumnosService.crear({
          ...alumno,
          matriculas: [
            {
              anio,
              cursoId: curso._id,
              estado: alumno.retirado ? 'retirada' : 'activa',
            },
          ],
        });
        resumen.alumnosCreados++;
      }
    }

    return resumen;
  }

  private async buscarCurso(anio: number, nivel: (typeof NIVELES)[number]) {
    const resultado = await this.cursosService.resolverCurso(anio, nivel);
    return resultado.estado === 'encontrado' ? resultado.curso : null;
  }

  private async asignaturasDelNivel(
    nivel: (typeof NIVELES)[number],
  ): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    for (const { codigo, niveles } of CATALOGO_ASIGNATURAS) {
      if (!niveles.includes(nivel)) continue;
      const asignatura = await this.asignaturasService.buscarPorCodigo(codigo);
      if (asignatura) ids.push(asignatura._id);
    }
    return ids;
  }
}
