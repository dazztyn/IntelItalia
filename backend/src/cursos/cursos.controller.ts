import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import {
  RequierePermisos,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { cursosPermitidos, tieneAccesoACurso } from '../usuarios/alcance';
import { CursoDocument } from './curso.schema';
import { CursosService } from './cursos.service';
import { CrearCursoDto } from './dto/crear-curso.dto';
import { PrepararAnioDto } from './dto/preparar-anio.dto';

function resumenCurso({ _id, anio, nivel, letra, nombre }: CursoDocument) {
  return { id: _id, anio, nivel, letra, nombre };
}

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
    return cursos.map(resumenCurso);
  }

  /** La Directora define los cursos que se imparten en el año (sección 3.2). */
  @Post()
  @RequierePermisos('cursos.gestionar')
  async crear(@Body() dto: CrearCursoDto) {
    return resumenCurso(await this.cursosService.registrar(dto));
  }

  /** Crea de una vez los cursos estándar (PK a 8°, sin letra) que falten en el año. */
  @Post('preparar-anio')
  @RequierePermisos('cursos.gestionar')
  async prepararAnio(@Body() { anio }: PrepararAnioDto) {
    const creados = await this.cursosService.prepararAnio(anio);
    const cursos = await this.cursosService.listarPorAnio(anio);
    return { creados, cursos: cursos.map(resumenCurso) };
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
