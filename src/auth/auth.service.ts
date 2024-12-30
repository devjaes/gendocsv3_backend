import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { UserEntity } from '../users/entities/users.entity'
import { JwtService } from '@nestjs/jwt'
import { compareSync } from 'bcrypt'
import { ModuleEntity } from '../modules/entities/module.entity'
import { EmailService } from '../email/services/email.service'
import { IPayload } from './types/payload.interface'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const { data: user } = await this.usersService.getByEmail(email)
    const validUser = this.validateUser(user, password)

    if (!validUser) {
      throw new UnauthorizedException(`Credenciales incorrectas`)
    }

    const accessModules = user.accessModules.map(
      (module: ModuleEntity) => module.id,
    )

    const accessCareersDegCert = user.accessCareersDegCert.map(
      (career) => career.id,
    )

    const payload: IPayload = {
      sub: user.id,
      outlookEmail: user.outlookEmail,
      googleEmail: user.googleEmail,
      firstName: user.firstName,
      firstLastName: user.firstLastName,
      secondName: user.secondName,
      secondLastName: user.secondLastName,
      role: user.role,
      isActive: user.isActive,
      accessModules,
      accessCareersDegCert,
    }

    return this.jwtService.sign(payload)
  }

  async forgotPassword(email: string) {
    const data = await this.usersService.getByEmail(email)
    this.validateUserExists(data?.data)

    const token = this.jwtService.sign({ email }, { expiresIn: '1h' })

    await this.emailService.sendRecoveryPasswordEmail(email, token)
    await this.usersService.updateRecoveryPasswordToken(email, token)
  }

  async newPassword(email: string, password: string, token: string) {
    const user = await this.usersService.getByEmail(email)
    this.validateUserExists(user?.data)
    const { data } = user
    const { recoveryPasswordToken } = data

    this.validateToken(recoveryPasswordToken)

    return this.usersService.newPassword(email, password, token)
  }

  async resendActivationEmail(email: string) {
    const user = await this.usersService.getByEmail(email)
    this.validateUserExists(user?.data)
    this.validateTries(user.data?.recoveryPasswordTokenTries)

    const token = this.jwtService.sign({ email }, { expiresIn: '1h' })

    await this.emailService.sendRecoveryPasswordEmail(email, token)
    await this.usersService.updateRecoveryPasswordToken(email, token)
  }

  private validateTries(recoveryPasswordTokenTries: number) {
    if (recoveryPasswordTokenTries >= 3) {
      throw new BadRequestException(
        `Has excedido el número de intentos permitidos para recuperación de contraseña`,
      )
    }
  }

  private validateToken(token: string) {
    try {
      return this.jwtService.verify(token, { ignoreExpiration: false })
    } catch (error) {
      throw new UnauthorizedException(`Token inválido`)
    }
  }

  private validateUserExists(user: UserEntity) {
    if (!user) throw new NotFoundException(`Usuario no encontrado`)
  }

  private validateUser(user: UserEntity, passwordToVerify: string) {
    return user && this.checkPassword(passwordToVerify, user.password)
  }

  private checkPassword(loginPassword: string, userPassword: string): boolean {
    return compareSync(loginPassword, userPassword)
  }
}
