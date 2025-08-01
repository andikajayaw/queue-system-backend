import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  // @IsEmail()
  // email: string;
  
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}