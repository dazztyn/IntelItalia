import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginGoogleDto 
{
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken!: string;
}