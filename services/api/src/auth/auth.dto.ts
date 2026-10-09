import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class RegisterDto {
    @IsEmail()
    email: string;
    @IsString()
    @MinLength(2)
    fullName: string;
    @IsString()
    @MinLength(8)
    password: string;
    @IsOptional()
    @IsString()
    phone?: string;
}
export class LoginDto {
    @IsEmail()
    email: string;
    @IsString()
    password: string;
}
export class RefreshDto {
    @IsString()
    refreshToken: string;
}

