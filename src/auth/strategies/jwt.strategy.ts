import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IPayload } from '../types/payload.interface'
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    })
  }

  async validate(payload: IPayload): Promise<IPayload> {
    return {
      sub: payload.sub,
      outlookEmail: payload.outlookEmail,
      googleEmail: payload.googleEmail,
      firstName: payload.firstName,
      firstLastName: payload.firstLastName,
      secondName: payload.secondName,
      secondLastName: payload.secondLastName,
      role: payload.role,
      isActive: payload.isActive,
      accessModules: payload.accessModules,
      accessCareersDegCert: payload.accessCareersDegCert,
    }
  }
}
