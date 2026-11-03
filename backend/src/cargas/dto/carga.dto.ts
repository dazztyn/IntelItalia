import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FUENTES_CARGA, type FuenteCarga } from '../schemas/carga.schema';

// Campos de texto del formulario multipart; el archivo llega aparte (`archivo`).
export class CargaDto {
  @IsIn(FUENTES_CARGA, { message: 'fuente no soportada todavía' })
  fuente!: FuenteCarga;

  /** DIA: diagnostico | monitoreo | cierre (el archivo no lo trae). */
  @IsString()
  @IsNotEmpty()
  momento!: string;
}

export class ConfirmarCargaDto extends CargaDto {
  /**
   * JSON `{ "<fila>": "<alumnoId>" | null }` con lo que el usuario eligió en la
   * vista previa para las filas dudosas; `null` descarta la fila.
   */
  @IsOptional()
  @IsString()
  resoluciones?: string;
}
