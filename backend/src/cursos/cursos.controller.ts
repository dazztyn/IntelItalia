import {Controller,ForbiddenException,Get, NotFoundException, Param, ParseIntPipe, Query} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import { cursosPermitidos, tieneAccesoACurso } from '../usuarios/alcance';
import { RequierePermisos, UsuarioActual} from '../usuarios/decorators/requiere-permisos.decorator';
import type { UsuarioAutorizado } from '../usuarios/usuarios.service';
import { CursosService } from './cursos.service';

@Controller('cursos')
export class CursosController {
  constructor(
    private readonly cursosService: CursosService,
    private readonly alumnosService: AlumnosService,
  ) {}

  /** Cursos del año; un docente solo ve los suyos (sección 7.4). */
  @Get()
  @RequierePermisos('alumnos.ver')
  async listar(
    @Query('anio', new ParseIntPipe({ optional: true }))
    anio: number | undefined,
    @UsuarioActual() usuario: UsuarioAutorizado,
  ) {
    const cursos = await this.cursosService.listarPorAnio(
      anio ?? new Date().getFullYear(),
      cursosPermitidos(usuario),
    );
    return cursos.map(({ _id, anio, nivel, letra, nombre }) => ({
      id: _id,
      anio,
      nivel,
      letra,
      nombre,
    }));
  }

  /** Alumnos con matrícula activa en el curso, solo con los campos del listado. */
  @Get(':id/alumnos')
  @RequierePermisos('alumnos.ver')
  async listarAlumnos(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UsuarioActual() usuario: UsuarioAutorizado,
  ) {
    // Antes de buscar el curso, para no revelar qué ids existen.
    if (!tieneAccesoACurso(usuario, id)) throw new ForbiddenException();

    const curso = await this.cursosService.buscarPorId(id);
    if (!curso) throw new NotFoundException('El curso no existe');

    const alumnos = await this.alumnosService.listarPorCurso(
      curso._id,
      curso.anio,
    );
    // Mapeo explícito: nunca se envían `pie`, `nombreNormalizado` ni `matriculas`.
    return alumnos.map((alumno) => ({
      id: alumno._id,
      rut: alumno.rut,
      ipe: alumno.ipe,
      nombres: alumno.nombres,
      apellidoPaterno: alumno.apellidoPaterno,
      apellidoMaterno: alumno.apellidoMaterno,
    }));
  }
}
