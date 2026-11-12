import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { AlumnosService } from '../alumnos/alumnos.service';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { CursosService } from '../cursos/cursos.service';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';
import { tieneAccesoACurso } from '../usuarios/alcance';

// Ficha del alumno (docs/ARQUITECTURA.md, sección 9): junta en una respuesta lo
// que se sabe del alumno. Solo lee; las alertas las calcula su propio motor.
@Injectable()
export class FichasService {
  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly cursosService: CursosService,
    private readonly evaluacionesService: EvaluacionesService,
    private readonly eventos: EventEmitter2,
  ) {}

  async obtener(id: Types.ObjectId, usuario: UsuarioAutorizado, ip: string) {
    const alumno = await this.alumnosService.buscarPorId(id);
    if (!alumno) throw new NotFoundException('El alumno no existe');

    // Alcance por curso (sección 7.4): el docente solo ve alumnos de sus cursos.
    if (
      !alumno.matriculas.some((matricula) =>
        tieneAccesoACurso(usuario, matricula.cursoId),
      )
    ) {
      this.auditar(usuario, id, ip, 'accesoDenegado');
      throw new ForbiddenException('El alumno no está en sus cursos');
    }

    // 1. Extraemos los IDs de los cursos sin duplicados
    const idsCursosUnicos = [
      ...new Set(alumno.matriculas.map((m) => String(m.cursoId))),
    ].map((idTexto) => new Types.ObjectId(idTexto));

    // 2. Traemos TODOS los cursos en un solo viaje a Mongoose
    const cursosBD = await this.cursosService.buscarPorIds(idsCursosUnicos);

    // 3. Creamos un diccionario en memoria O(1)
    const mapaCursos = new Map(cursosBD.map((c) => [String(c._id), c.nombre]));

    // 4. Mapeamos las matrículas instantáneamente (sin async/await dentro del loop)
    const matriculas = [...alumno.matriculas]
      .sort((a, b) => b.anio - a.anio)
      .map(({ anio, estado, cursoId }) => ({
        anio,
        estado,
        curso: {
          id: String(cursoId),
          nombre: mapaCursos.get(String(cursoId)) ?? null,
        },
      }));

    // 5. Hacemos el Promise.all SOLO para las evaluaciones (y el PIE si aplica)
    const [evaluaciones, pie] = await Promise.all([
      this.evaluacionesService.listarPorAlumno(id),
      // Dato sensible: solo con `pie.ver` (sección 8.2).
      usuario.permisos.includes('pie.ver')
        ? this.alumnosService.obtenerDatosPie(id)
        : Promise.resolve(undefined),
    ]);

    this.auditar(usuario, id, ip, 'ficha.ver');

    return {
      id: String(alumno._id),
      rut: alumno.rut,
      ipe: alumno.ipe,
      nombres: alumno.nombres,
      apellidoPaterno: alumno.apellidoPaterno,
      apellidoMaterno: alumno.apellidoMaterno,
      matriculas,
      ...(usuario.permisos.includes('pie.ver') && {
        pie: pie ? { participa: pie.participa, tipoNee: pie.tipoNee } : null,
      }),
      evaluaciones: evaluaciones.map((resultado) => ({
        tipo: resultado.tipoEvaluacionId.codigo,
        nombre: resultado.tipoEvaluacionId.nombre,
        anio: resultado.anio,
        momento: resultado.momento,
        area: resultado.area,
        resultados: resultado.resultados,
        nivelNormalizado: resultado.nivelNormalizado,
      })),
      // ⏳ Los llena el motor de alertas (sección 5) desde `estadosAlumno`.
      semaforo: null,
      alertas: [],
    };
  }

  private auditar(
    usuario: UsuarioAutorizado,
    alumnoId: Types.ObjectId,
    ip: string,
    accion: 'ficha.ver' | 'accesoDenegado',
  ) {
    this.eventos.emit('auditoria.acceso', {
      usuarioId: usuario.id,
      accion,
      recurso: 'alumnos',
      recursoId: String(alumnoId),
      alumnoId,
      ip,
      fecha: new Date(),
    });
  }
}
