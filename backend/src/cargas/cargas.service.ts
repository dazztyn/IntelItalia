import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isObjectIdOrHexString, Types } from 'mongoose';
import type { UsuarioAutorizado } from '../comun/autorizacion';
import { cursosPermitidos, tieneAccesoACurso } from '../usuarios/alcance';
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
    return this.estrategiaPara(dto, archivo, usuario).previsualizar(
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
    const estrategia = this.estrategiaPara(dto, archivo, usuario);
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

  // shortcut: últimas 50 cargas sin paginar ni filtrar; agregar filtros cuando haya muchas.
  async listar(usuario: UsuarioAutorizado) {
    const cargas = await this.cargasRepo.listarRecientes(
      this.fuentesPermitidas(usuario),
      cursosPermitidos(usuario),
    );
    return cargas.map(resumenCarga);
  }

  async obtener(id: Types.ObjectId, usuario: UsuarioAutorizado) {
    const carga = await this.cargasRepo.buscarPorId(id);
    if (!carga) throw new NotFoundException('La carga no existe');
    if (
      !this.fuentesPermitidas(usuario).includes(carga.fuente) ||
      !tieneAccesoACurso(usuario, carga.cursoId)
    ) {
      throw new ForbiddenException();
    }
    return detalleCarga(carga);
  }

  /**
   * Estrategia de la fuente, después de revisar el permiso y la extensión. El
   * permiso depende de la fuente, así que se revisa aquí y no en el guard.
   */
  private estrategiaPara(
    dto: CargaDto,
    archivo: ArchivoSubido,
    usuario: UsuarioAutorizado,
  ): EstrategiaCarga {
    const estrategia = this.obtenerEstrategia(dto.fuente);
    if (!usuario.permisos.includes(estrategia.permiso)) {
      throw new ForbiddenException();
    }
    if (!archivo.originalname.toLowerCase().endsWith(estrategia.extension)) {
      throw new BadRequestException(
        `Solo se aceptan archivos ${estrategia.extension}`,
      );
    }
    return estrategia;
  }

  /** Fuentes que el usuario puede cargar y consultar, según sus permisos. */
  private fuentesPermitidas(usuario: UsuarioAutorizado): string[] {
    return [...this.estrategias.values()]
      .filter(({ permiso }) => usuario.permisos.includes(permiso))
      .map(({ fuente }) => fuente);
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
