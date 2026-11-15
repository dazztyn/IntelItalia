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
  SoloAutenticado,
  UsuarioActual,
  type UsuarioAutorizado,
} from '../comun/autorizacion';
import { ArchivoSubido, CargasService } from './cargas.service';
import { CargaDto, ConfirmarCargaDto } from './dto/carga.dto';

// Sin `dest`, multer deja el archivo en memoria: nunca se escribe en disco y se
// descarta al terminar la petición (minimización, sección 8.4).
const archivoEnMemoria = FileInterceptor('archivo', {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function validarArchivo(archivo?: ArchivoSubido): ArchivoSubido {
  if (!archivo) throw new BadRequestException('Falta el archivo');
  return archivo;
}

// El permiso depende de la fuente (fuentes.ts), así que lo revisa CargasService y
// aquí solo se exige la sesión. Es la excepción a "cada endpoint con @RequierePermisos".
@SoloAutenticado()
@Controller('cargas')
export class CargasController {
  constructor(private readonly cargasService: CargasService) {}

  @Post('vista-previa')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(archivoEnMemoria)
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
  @UseInterceptors(archivoEnMemoria)
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
  listar(@UsuarioActual() usuario: UsuarioAutorizado) {
    return this.cargasService.listar(usuario);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UsuarioActual() usuario: UsuarioAutorizado,
  ) {
    return this.cargasService.obtener(id, usuario);
  }
}
