import { IsInt, Max, Min } from 'class-validator';

export class PrepararAnioDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;
}
