import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-auth/jwt-refresh-guard';
import { RolesGuard } from './guards/roles/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Hanya admin yang bisa register user baru
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    console.log('Setting cookie for refresh_token:', result.refreshToken); // debug

    // Set cookie untuk refresh token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false, // false kalau masih lokal tanpa HTTPS
      sameSite: 'lax', // lebih fleksibel daripada 'strict'
      maxAge: 5 * 60 * 1000,
    });

    // return this.authService.login(loginDto);
    return {
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
      refresh_token: result.refreshToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    return this.authService.logout(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Get('test-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  testAdmin() {
    return { message: 'Hanya admin yang bisa akses endpoint ini' };
  }

  @Get('test-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  testStaff() {
    return { message: 'Admin dan Staff bisa akses endpoint ini' };
  }

  @Post('refresh-token')
  @UseGuards(JwtRefreshGuard) // Guard untuk validasi refresh token (custom)
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('user dari guard:', req.user);
    const result = await this.authService.refreshAccessToken(req.user.id);

    // Set refresh token baru di cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false, // false kalau masih lokal tanpa HTTPS
      sameSite: 'lax', // lebih fleksibel daripada 'strict'
      maxAge: 5 * 60 * 1000,
    });

    return {
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
      refresh_token: result.refreshToken,
    };
  }
}
