import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearUsuarioDto {
  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  rol!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  cursoIds?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}