import { Types } from 'mongoose';
import type { UsuarioAutorizado } from '../../comun/autorizacion';
import { Nivel } from '../../cursos/niveles';
import { CargaDto } from '../dto/carga.dto';
import { ErrorFila, FuenteCarga } from '../schemas/carga.schema';
import { ArchivoSubido } from '../interfaces/archivo-subido.interface';
import { VistaPrevia } from '../interfaces/vista-previa.interface';

export interface FilaExtraida<TDatos = unknown> {
  fila: number;
  numeroLista: number | null;
  nombre: string;
  error?: string;
  sinResultado?: boolean;
  datos: TDatos;
}

export interface DatosParseados<TDatos = unknown, TMeta = unknown> {
  anio: number;
  nivel: Nivel;
  letra: string | null;
  area: 'lenguaje' | 'matematica';
  ejes: string[];
  filas: FilaExtraida<TDatos>[];
  meta: TMeta;
}

export interface FilaAprobada<TDatos = unknown> {
  filaOriginal: FilaExtraida<TDatos>;
  alumnoId: string;
}

export interface ResultadoProcesamientoCarga {
  cursoId: Types.ObjectId;
  anio: number;
  momento: string;
  area: string;
  filasTotales: number;
  filasOk: number;
  errores: ErrorFila[];
}

export interface EstrategiaCarga {
  readonly fuente: FuenteCarga;

  previsualizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ): Promise<VistaPrevia>;

  procesarConfirmacion(
    archivo: ArchivoSubido,
    dto: CargaDto,
    resoluciones: Record<string, string | null>,
    usuario: UsuarioAutorizado,
    cargaId: Types.ObjectId,
  ): Promise<ResultadoProcesamientoCarga>;
}
