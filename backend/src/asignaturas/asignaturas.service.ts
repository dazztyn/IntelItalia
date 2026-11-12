import { Injectable, OnModuleInit } from '@nestjs/common';
import { Types } from 'mongoose';
import { normalizarTexto } from '../comun/texto';
import { Area, AsignaturaDocument } from './asignatura.schema';
import { CATALOGO_ASIGNATURAS } from './catalogo';
import { AsignaturasRepository } from './repositorios/asignaturas.repository';

@Injectable()
export class AsignaturasService implements OnModuleInit {
  constructor(private readonly asignaturasRepo: AsignaturasRepository) {}

  async onModuleInit(): Promise<void> {
    await this.asegurarCatalogo();
  }

  listar(): Promise<AsignaturaDocument[]> {
    return this.asignaturasRepo.listar();
  }

  listarPorArea(area: Area): Promise<AsignaturaDocument[]> {
    return this.asignaturasRepo.listarPorArea(area);
  }

  buscarPorCodigo(codigo: string): Promise<AsignaturaDocument | null> {
    return this.asignaturasRepo.buscarPorCodigo(codigo);
  }

  buscarPorCodigos(codigos: string[]): Promise<AsignaturaDocument[]> {
    return this.asignaturasRepo.buscarPorCodigos(codigos);
  }

  buscarPorNombre(
    nombre: string,
    entreIds?: Types.ObjectId[],
  ): Promise<AsignaturaDocument[]> {
    return this.asignaturasRepo.buscarPorNombre(
      normalizarTexto(nombre),
      entreIds,
    );
  }

  async asegurarCatalogo(): Promise<number> {
    return this.asignaturasRepo.asegurarCatalogo(CATALOGO_ASIGNATURAS);
  }
}
