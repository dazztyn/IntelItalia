import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isObjectIdOrHexString, Types } from 'mongoose';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';
import { DiaEstrategia } from './estrategias/dia.estrategia';
import { ArchivoSubido } from './interfaces/archivo-subido.interface';
import { EstrategiaCarga } from './estrategias/estrategia-carga.interface';
import { VistaPrevia } from './interfaces/vista-previa.interface';
import { CargasRepository } from './repositorios/cargas.repository';
import { CargaDocument, FuenteCarga } from './schemas/carga.schema';

@Injectable()
export class CargasService {
  private readonly estrategias = new Map<FuenteCarga, EstrategiaCarga>();

  constructor(
    private readonly cargasRepo: CargasRepository,
    private readonly diaEstrategia: DiaEstrategia,
    private readonly eventos: EventEmitter2,
  ) {
    this.estrategias.set(this.diaEstrategia.fuente, this.diaEstrategia);
  }

  previsualizar(
    archivo: ArchivoSubido,
    dto: CargaDto,
    usuario: UsuarioAutorizado,
  ): Promise<VistaPrevia> {
    return this.obtenerEstrategia(dto.fuente).previsualizar(
      archivo,
      dto,
      usuario,
    );
  }

  async confirmar(
    archivo: ArchivoSubido,
    dto: ConfirmarCargaDto,
    usuario: UsuarioAutorizado,
    ip: string,
  ) {
    const estrategia = this.obtenerEstrategia(dto.fuente);
    const resoluciones = leerResoluciones(dto.resoluciones);
    const iniciadaEn = new Date();
    const cargaId = new Types.ObjectId();

    const resultado = await estrategia.procesarConfirmacion(
      archivo,
      dto,
      resoluciones,
      usuario,
      cargaId,
    );

    const carga = await this.cargasRepo.crear({
      _id: cargaId,
      fuente: dto.fuente,
      nombreArchivo: archivo.originalname.slice(0, 200),
      usuarioId: usuario.id,
      cursoId: resultado.cursoId,
      anio: resultado.anio,
      momento: resultado.momento,
      area: resultado.area,
      estado:
        resultado.errores.length === 0
          ? 'completada'
          : resultado.filasOk === 0
            ? 'fallida'
            : 'completadaConErrores',
      filasTotales: resultado.filasTotales,
      filasOk: resultado.filasOk,
      errores: resultado.errores,
      iniciadaEn,
      finalizadaEn: new Date(),
    });

    this.eventos.emit('auditoria.acceso', {
      usuarioId: usuario.id,
      accion: 'carga.crear',
      recurso: 'cargas',
      recursoId: String(cargaId),
      ip,
      fecha: new Date(),
    });

    return detalleCarga(carga);
  }

  async listar() {
    const cargas = await this.cargasRepo.listarRecientes(50);
    return cargas.map(resumenCarga);
  }

  async obtener(id: Types.ObjectId) {
    const carga = await this.cargasRepo.buscarPorId(id);
    if (!carga) throw new NotFoundException('La carga no existe');
    return detalleCarga(carga);
  }

  private obtenerEstrategia(fuente: FuenteCarga): EstrategiaCarga {
    const estrategia = this.estrategias.get(fuente);
    if (!estrategia) {
      throw new BadRequestException(`Fuente de carga no soportada: ${fuente}`);
    }
    return estrategia;
  }
}

function leerResoluciones(json?: string): Record<string, string | null> {
  if (!json) return {};
  let valor: unknown;
  try {
    valor = JSON.parse(json);
  } catch {
    throw new BadRequestException('resoluciones no es un JSON válido');
  }
  const esValido =
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor) &&
    Object.entries(valor).every(
      ([fila, id]) =>
        /^\d+$/.test(fila) && (id === null || isObjectIdOrHexString(id)),
    );
  if (!esValido) {
    throw new BadRequestException(
      'resoluciones debe ser { "<fila>": "<alumnoId>" | null }',
    );
  }
  return valor as Record<string, string | null>;
}

function resumenCarga(carga: CargaDocument) {
  return {
    id: String(carga._id),
    fuente: carga.fuente,
    nombreArchivo: carga.nombreArchivo,
    cursoId: String(carga.cursoId),
    anio: carga.anio,
    momento: carga.momento,
    area: carga.area,
    estado: carga.estado,
    filasTotales: carga.filasTotales,
    filasOk: carga.filasOk,
    iniciadaEn: carga.iniciadaEn,
    finalizadaEn: carga.finalizadaEn,
  };
}

function detalleCarga(carga: CargaDocument) {
  return {
    ...resumenCarga(carga),
    errores: carga.errores.map(({ fila, campo, mensaje }) => ({
      fila,
      campo,
      mensaje,
    })),
  };
}
