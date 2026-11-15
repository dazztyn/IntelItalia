import { Injectable, OnModuleInit } from '@nestjs/common';
import { Types } from 'mongoose';
import { TipoEvaluacionDocument } from './schemas/tipo-evaluacion.schema';
import { TIPOS_EVALUACION_INICIALES } from './tipos-iniciales';
import { DatosResultado } from './interfaces/datos-resultado.interface';
import { EvaluacionesRepository } from './repositorios/evaluaciones.repository';

@Injectable()
export class EvaluacionesService implements OnModuleInit {
  constructor(private readonly evaluacionesRepo: EvaluacionesRepository) {}

  async onModuleInit(): Promise<void> {
    await this.asegurarTiposIniciales();
  }

  asegurarTiposIniciales(): Promise<number> {
    return this.evaluacionesRepo.asegurarTiposIniciales(
      TIPOS_EVALUACION_INICIALES,
    );
  }

  buscarTipoPorCodigo(codigo: string): Promise<TipoEvaluacionDocument | null> {
    return this.evaluacionesRepo.buscarTipoPorCodigo(codigo);
  }

  guardarResultado(datos: DatosResultado): Promise<void> {
    return this.evaluacionesRepo.guardarResultado(datos);
  }

  listarPorAlumno(alumnoId: Types.ObjectId) {
    return this.evaluacionesRepo.listarPorAlumno(alumnoId);
  }
}
