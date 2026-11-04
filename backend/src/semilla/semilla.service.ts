import { Injectable } from '@nestjs/common';
import { AlumnosService } from '../alumnos/alumnos.service';
import { AsignaturasService } from '../asignaturas/asignaturas.service';
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

    resumen.cursosCreados = await this.cursosService.prepararAnio(anio);

    for (const [indice, nivel] of NIVELES.entries()) {
      const resultado = await this.cursosService.resolverCurso(anio, nivel);
      if (resultado.estado !== 'encontrado') continue;
      const curso = resultado.curso;

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
}
