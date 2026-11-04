import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { NIVELES, type Nivel } from '../niveles';

export class CrearCursoDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;

  @IsIn(NIVELES)
  nivel!: Nivel;

  @IsOptional()
  @Matches(/^[A-Za-z]$/, { message: 'letra debe ser una sola letra (A-Z)' })
  letra?: string | null;
}
