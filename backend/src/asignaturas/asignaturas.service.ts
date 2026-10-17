import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizarTexto } from '../comun/texto';
import { Area, Asignatura, AsignaturaDocument } from './asignatura.schema';
import { CATALOGO_ASIGNATURAS } from './catalogo';

@Injectable()
export class AsignaturasService {
  constructor(
    @InjectModel(Asignatura.name)
    private readonly asignaturaModel: Model<Asignatura>,
  ) {}

  listar(): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel.find().sort({ codigo: 1 }).exec();
  }

  listarPorArea(area: Area): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel.find({ area }).sort({ codigo: 1 }).exec();
  }

  buscarPorCodigo(codigo: string): Promise<AsignaturaDocument | null> {
    return this.asignaturaModel
      .findOne({ codigo: codigo.trim().toUpperCase() })
      .exec();
  }

  /**
   * Reconoce una asignatura por su nombre o un alias, como viene en un archivo.
   * Un alias puede repetirse entre niveles ("Lenguaje" en PK/K y en básica), así que
   * al cargar se pasan las asignaturas del curso (`curso.asignaturaIds`) para acotar.
   */
  buscarPorNombre(
    nombre: string,
    entreIds?: Types.ObjectId[],
  ): Promise<AsignaturaDocument[]> {
    return this.asignaturaModel
      .find({
        nombresNormalizados: normalizarTexto(nombre),
        ...(entreIds ? { _id: { $in: entreIds } } : {}),
      })
      .exec();
  }

  /**
   * Crea las asignaturas del catálogo que no existan. Las existentes no se tocan,
   * para no pisar cambios hechos después en la plataforma.
   */
  async asegurarCatalogo(): Promise<number> {
    let creadas = 0;
    for (const { codigo, nombre, area, aliases } of CATALOGO_ASIGNATURAS) {
      if (await this.asignaturaModel.exists({ codigo })) continue;
      await this.asignaturaModel.create({ codigo, nombre, area, aliases });
      creadas++;
    }
    return creadas;
  }
}
