import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { PERMISOS, type Permiso } from '../permisos';

export class ActualizarPermisosRolDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISOS, { each: true })
  permisos!: Permiso[];
}