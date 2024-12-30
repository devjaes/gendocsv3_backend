import { Body, Controller, Post, Res } from '@nestjs/common'
import { AuthService } from './auth.service'
import { ApiTags } from '@nestjs/swagger'
import { LoginDto } from './dto/login.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { Response } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = await this.authService.login(
      loginDto.email,
      loginDto.password,
    )

    response.cookie('access_token', token, {
      // secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      maxAge: 1000 * 60 * 60 * 24 * 30,
    })

    return new ApiResponseDto('¡Hola de nuevo!', token)
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token')

    return new ApiResponseDto('Hasta luego', null)
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email)

    return new ApiResponseDto(
      `Se ha enviado un correo a ${body.email} para recuperar tu contraseña. Revisa tu bandeja de entrada o spam.`,
      null,
    )
  }

  @Post('new-password')
  async newPassword(
    @Body() body: { email: string; password: string; token: string },
  ) {
    return this.authService.newPassword(body.email, body.password, body.token)
  }

  @Post('resend-activation-email')
  async resendActivationEmail(@Body() body: { email: string }) {
    await this.authService.resendActivationEmail(body.email)

    return new ApiResponseDto(
      `Se ha enviado un correo a ${body.email} para activar tu cuenta. Revisa tu bandeja de entrada o spam.`,
      null,
    )
  }
}
