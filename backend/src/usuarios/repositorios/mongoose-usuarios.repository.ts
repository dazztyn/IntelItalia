import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model } from 'mongoose';
import {
  DatosActualizarUsuario,
  DatosCrearUsuario,
} from '../interfaces/datos-usuario.interface';
import { Usuario, UsuarioDocument } from '../schemas/usuario.schema';
import { UsuariosRepository } from './usuarios.repository';

@Injectable()
export class MongooseUsuariosRepository extends UsuariosRepository {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {
    super();
  }

  crear(datos: DatosCrearUsuario): Promise<UsuarioDocument> {
    return this.usuarioModel.create({
      ...datos,
      correo: datos.correo.trim().toLowerCase(),
    });
  }

  async asegurarDirectoraInicial(correo: string): Promise<void> {
    const correoNormalizado = correo.trim().toLowerCase();
    await this.usuarioModel.updateOne(
      { correo: correoNormalizado },
      {
        $setOnInsert: {
          correo: correoNormalizado,
          nombre: 'Directora',
          rol: 'directora',
          cursoIds: [],
          activo: true,
        },
      },
      { upsert: true },
    );
  }

  async buscarActivoPorId(id: string): Promise<UsuarioDocument | null> {
    if (!isObjectIdOrHexString(id)) return null;
    return this.usuarioModel.findOne({ _id: id, activo: true }).exec();
  }

  async buscarPorId(id: string): Promise<UsuarioDocument | null> {
    if (!isObjectIdOrHexString(id)) return null;
    return this.usuarioModel.findById(id).exec();
  }

  buscarPorCorreo(correo: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel
      .findOne({ correo: correo.trim().toLowerCase() })
      .exec();
  }

  listarTodos(): Promise<UsuarioDocument[]> {
    return this.usuarioModel.find().sort({ activo: -1, nombre: 1 }).exec();
  }

  async actualizar(
    id: string,
    datos: DatosActualizarUsuario,
  ): Promise<UsuarioDocument | null> {
    if (!isObjectIdOrHexString(id)) return null;
    return this.usuarioModel
      .findByIdAndUpdate(id, { $set: datos }, { new: true })
      .exec();
  }

  async registrarUltimoAcceso(id: string, fecha: Date): Promise<void> {
    if (!isObjectIdOrHexString(id)) return;
    await this.usuarioModel
      .updateOne({ _id: id }, { $set: { ultimoAcceso: fecha } })
      .exec();
  }
}