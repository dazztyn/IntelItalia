import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Types } from 'mongoose';
import {
  RequierePermisos,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { ArchivoSubido, CargasService } from './cargas.service';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';

// Sin `dest`, multer deja el archivo en memoria: nunca se escribe en disco y se
// descarta al terminar la petición (minimización, sección 8.4).
const archivoXlsx = FileInterceptor('archivo', {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function validarArchivo(archivo?: ArchivoSubido): ArchivoSubido {
  if (!archivo) throw new BadRequestException('Falta el archivo');
  if (!/\.xlsx$/i.test(archivo.originalname)) {
    throw new BadRequestException('Solo se aceptan archivos .xlsx');
  }
  return archivo;
}

// shortcut: todo exige `cargas.evaluaciones` porque la única fuente es el DIA; cuando
// lleguen Mi Aula notas y asistencia, el permiso dependerá de la fuente.
@Controller('cargas')
export class CargasController {
  constructor(private readonly cargasService: CargasService) {}

  @Post('vista-previa')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos('cargas.evaluaciones')
  @UseInterceptors(archivoXlsx)
  previsualizar(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body() dto: CargaDto,
    @UsuarioActual() usuario: UsuarioAutorizado,
  ) {
    return this.cargasService.previsualizar(
      validarArchivo(archivo),
      dto,
      usuario,
    );
  }

  @Post()
  @RequierePermisos('cargas.evaluaciones')
  @UseInterceptors(archivoXlsx)
  confirmar(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body() dto: ConfirmarCargaDto,
    @UsuarioActual() usuario: UsuarioAutorizado,
    @Req() peticion: Request,
  ) {
    return this.cargasService.confirmar(
      validarArchivo(archivo),
      dto,
      usuario,
      peticion.ip || 'desconocida',
    );
  }

  @Get()
  @RequierePermisos('cargas.evaluaciones')
  listar() {
    return this.cargasService.listar();
  }

  @Get(':id')
  @RequierePermisos('cargas.evaluaciones')
  obtener(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.cargasService.obtener(id);
  }
}
