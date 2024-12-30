import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { UserEntity } from './entities/users.entity'
import { CreateUserDTO } from './dto/create-user.dto'
import { genSalt, hash } from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { UserAccessModulesService } from '../users-access-modules/users-access-modules.service'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UserFiltersDto } from './dto/user-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { FilesService } from '../files/services/files.service'
import { RolesType } from '../shared/constants/roles'
import { UsersGateway } from './users.gateway'
import { IPayload } from '../auth/types/payload.interface'
import { ModuleEntity } from '../modules/entities/module.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly filesService: FilesService,

    private readonly usersGateway: UsersGateway,
    private readonly userAccessModulesService: UserAccessModulesService,

    private readonly dataSource: DataSource,
  ) {}

  async getByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: {
        outlookEmail: email,
        isActive: true,
      },
    })

    if (!user || user == null) {
      throw new HttpException('No se encontró el usuario', HttpStatus.NOT_FOUND)
    }

    return new ApiResponseDto('Usuario encontrado', user)
  }

  async create(user: CreateUserDTO) {
    const alreadyExists = await this.userRepository.findOne({
      where: {
        outlookEmail: user.outlookEmail,
      },
    })

    if (alreadyExists) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT)
    }

    const password = await this.generateSaltPassword(user.password)

    if (!password) {
      throw new HttpException(
        'No se pudo crear el usuario',
        HttpStatus.CONFLICT,
      )
    }

    const userEntity = await this.userRepository.create({
      ...user,
      accessModules: [],
      password,
      accessCareersDegCert: [],
    })

    if (!userEntity) {
      throw new HttpException(
        'No se pudo crear el usuario',
        HttpStatus.CONFLICT,
      )
    }

    let userSaved = await this.userRepository.save(userEntity)

    const { data } = await this.userAccessModulesService.create({
      userId: userSaved.id,
      modulesIds: user.accessModules,
    })

    if (data.modules.length === 0) {
      throw new HttpException(
        'No se pudo crear asignar los modulos al usuario',
        HttpStatus.CONFLICT,
      )
    }

    userEntity.accessModules = data.modules

    if (user.accessCareersDegCert && user.accessCareersDegCert.length > 0) {
      const { data: careersAccess } =
        await this.userAccessModulesService.createCareerAccessDegCert({
          userId: userSaved.id,
          careerIds: user.accessCareersDegCert,
        })

      userSaved.accessCareersDegCert = careersAccess.careers
    }

    userSaved = await this.userRepository.save(userEntity)

    if (!userSaved) {
      throw new HttpException(
        'No se pudo crear el usuario',
        HttpStatus.CONFLICT,
      )
    }

    const { error, data: isShared } = await this.filesService.shareAsset(
      `${process.env.GOOGLE_DRIVE_SHARABLE_FOLDER_ID}`,
      userSaved.googleEmail,
      user.role === RolesType.READER ? 'reader' : 'writer',
    )

    if (error || !isShared) {
      userSaved.remove()

      throw new HttpException(
        'No se pudo otorgar permisos en Google Drive, verifique el correo de gmail del usuario',
        HttpStatus.CONFLICT,
      )
    }

    return new ApiResponseDto(
      'Usuario creado correctamente, tome en cuenta que la habilitación de permisos de documentos tardará 10-15 minutos en aplicarse',
      {
        ...userSaved,
        accessModules: userSaved.accessModules.map((module) => module.id),
      },
    )
  }

  async update(id: number, user: Partial<CreateUserDTO>) {
    try {
      let userToUpdate = user
      let password = ''
      const hasNewPassword = user.password !== undefined
      const hasAccessModules = !!user.accessModules
      const hasCareersAccess = !!user.accessCareersDegCert
      const userFound = await this.userRepository.findOne({
        where: {
          id,
        },
      })

      if (!userFound) {
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.NOT_FOUND,
        )
      }

      const currentUser = { ...userFound }
      if (hasAccessModules) {
        const result = await this.userAccessModulesService.update({
          userId: id,
          modulesIds: user.accessModules,
        })

        if (result.data.modules.length === 0) {
          throw new HttpException(
            'No se pudo actualizar los modulos del usuario',
            HttpStatus.CONFLICT,
          )
        }
        userToUpdate.accessModules = result.data.modules.map(
          (module) => module.id,
        )
      }

      if (hasCareersAccess) {
        const result =
          await this.userAccessModulesService.updateCareerAccessDegCert({
            userId: id,
            careerIds: user.accessCareersDegCert,
          })

        if (result.data.careers.length === 0) {
          throw new HttpException(
            'No se pudo actualizar los modulos del usuario',
            HttpStatus.CONFLICT,
          )
        }
        userToUpdate.accessCareersDegCert = result.data.careers.map(
          (module) => module.id,
        )
      }
      const userGetted = await this.userRepository.findOne({
        where: {
          id,
        },
        relations: {
          accessCareersDegCert: true,
        },
      })

      if (!userGetted) {
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.NOT_FOUND,
        )
      }

      if (hasNewPassword) {
        password = await this.generateSaltPassword(user.password)

        userToUpdate = {
          ...user,
          password,
        }
      }

      const willBeActive =
        user.isActive && user.isActive === true ? true : userGetted.isActive
      const ischangedEmail =
        user.googleEmail && user.googleEmail !== userGetted.googleEmail

      if (user.role && userGetted.role !== user.role && willBeActive) {
        let isChanged = false
        let role = undefined

        if (
          user.role === RolesType.READER &&
          userGetted.role !== RolesType.READER
        ) {
          role = 'reader'
          isChanged = true
        } else if (
          user.role !== RolesType.READER &&
          userGetted.role === RolesType.READER
        ) {
          role = 'writer'
          isChanged = true
        }

        if (isChanged && role !== undefined) {
          const email = ischangedEmail
            ? user.googleEmail
            : userGetted.googleEmail

          const { error, data: isShared } = await this.filesService.shareAsset(
            process.env.GOOGLE_DRIVE_SHARABLE_FOLDER_ID,
            email,
            role,
          )

          if (error || !isShared) {
            await this.userRepository.update({ id }, currentUser)

            throw new HttpException(
              'No se pudo otorgar permisos en Google Drive, verifique el correo de gmail del usuario',
              HttpStatus.CONFLICT,
            )
          }
        }
      }

      await this.userRepository.update(
        {
          id,
        },
        {
          ...userToUpdate,
          accessModules: undefined,
          accessCareersDegCert: undefined,
        },
      )

      const userUpdated = await this.userRepository.findOne({
        where: {
          id,
        },
        relations: {
          accessModules: true,
          accessCareersDegCert: true,
        },
      })

      if (ischangedEmail) {
        const { error: unsharedError, data: isUnshared } =
          await this.filesService.shareAsset(
            `${process.env.GOOGLE_DRIVE_SHARABLE_FOLDER_ID}`,
            currentUser.googleEmail,
            'reader',
          )

        if (!isUnshared || unsharedError) {
          await this.userRepository.update({ id }, currentUser)

          throw new HttpException(
            'No se pudo revocar permisos en Google Drive, verifique el correo de gmail del usuario',
            HttpStatus.CONFLICT,
          )
        }
      }

      if (user.isActive !== undefined && user.isActive === false) {
        const { error, data: isUnshared } = await this.filesService.shareAsset(
          `${process.env.GOOGLE_DRIVE_SHARABLE_FOLDER_ID}`,
          currentUser.googleEmail,
          'reader',
        )

        if (error || !isUnshared) {
          await this.userRepository.update(
            { id },
            {
              ...currentUser,
              accessModules: undefined,
              accessCareersDegCert: undefined,
            },
          )

          throw new HttpException(
            'No se pudo revocar permisos en Google Drive',
            HttpStatus.CONFLICT,
          )
        }
      }

      const accessModules = userUpdated.accessModules.map(
        (module: ModuleEntity) => module.id,
      )

      const accessCareersDegCert = userUpdated.accessCareersDegCert.map(
        (career) => career.id,
      )

      const payload: IPayload = {
        sub: id,
        outlookEmail: userUpdated.outlookEmail,
        googleEmail: userUpdated.googleEmail,
        firstName: userUpdated.firstName,
        firstLastName: userUpdated.firstLastName,
        secondName: userUpdated.secondName,
        secondLastName: userUpdated.secondLastName,
        role: userUpdated.role,
        isActive: userUpdated.isActive,
        accessModules,
        accessCareersDegCert,
      }
      const userUpdatedPayload = {
        ...userUpdated,
        accessModules: userUpdated.accessModules.map((module) => module.id),
        accessCareersDegCert,
      }

      this.usersGateway.handleChangeUser({
        id,
        user: payload,
      })

      return new ApiResponseDto(
        'Usuario actualizado, tome en cuenta que la habilitación de permisos de documentos tardará 10-15 minutos en aplicarse',
        {
          user: userUpdatedPayload,
          accessToken: this.jwtService.sign(payload),
        },
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async delete(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
    })

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND)
    }

    const { error, data: isUnshared } = await this.filesService.shareAsset(
      `${process.env.GOOGLE_DRIVE_SHARABLE_FOLDER_ID}`,
      user.googleEmail,
      'reader',
    )

    if (error || !isUnshared) {
      throw new HttpException(
        'No se pudo revocar permisos en Google Drive',
        HttpStatus.CONFLICT,
      )
    }

    await this.userRepository.update(
      {
        id,
      },
      {
        isActive: false,
      },
    )

    return new ApiResponseDto('Usuario eliminado', {
      success: true,
    })
  }

  async findAll(paginationDto: PaginationDTO) {
    const { limit, page } = paginationDto
    const offset = (page - 1) * limit

    try {
      const users = await this.userRepository.find({
        select: {
          id: true,
          outlookEmail: true,
          googleEmail: true,
          firstName: true,
          firstLastName: true,
          secondName: true,
          secondLastName: true,
          role: true,
          isActive: true,
        },
        order: {
          id: 'ASC',
        },
        take: limit,
        skip: offset,
      })

      const usersFound = users.map((user) => ({
        ...user,
        accessModules: user.accessModules.map((module) => module.id),
        accessCareersDegCert: user.accessCareersDegCert.map(
          (career) => career.id,
        ),
      }))

      if (!users) {
        throw new HttpException('Usuarios no encontrados', HttpStatus.NOT_FOUND)
      }

      const count = await this.userRepository.count()

      return new ApiResponseDto('Usuarios encontrados', {
        count,
        users: usersFound,
      })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findByFilters(filters: UserFiltersDto) {
    const { limit, page } = filters
    const offset = (page - 1) * limit

    const qb = this.userRepository.createQueryBuilder('users')

    qb.where(
      '( (:state :: BOOLEAN) IS NULL OR users.isActive = (:state :: BOOLEAN) )',
      {
        state: filters.state,
      },
    ).andWhere(
      "( (:term :: VARCHAR ) IS NULL OR CONCAT_WS(' ', users.firstName, users.secondName, users.firstLastName, users.secondLastName) ILIKE :term)",
      {
        term: filters.field && `%${filters.field.trim()}%`,
      },
    )

    const count = await qb.getCount()
    if (count === 0) {
      throw new NotFoundException('User not found')
    }

    const users = await qb
      .orderBy('users.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany()

    return new ApiResponseDto('Usuarios encontrados', {
      count,
      users,
    })
  }

  async updateRecoveryPasswordToken(email: string, token: string) {
    await this.userRepository.update(
      {
        outlookEmail: email,
      },
      {
        recoveryPasswordToken: token,
        recoveryPasswordTokenTries: () => 'recovery_password_token_tries + 1',
      },
    )
  }

  async newPassword(email: string, password: string, token: string) {
    const user = await this.userRepository.findOne({
      where: {
        outlookEmail: email,
        recoveryPasswordToken: token,
      },
    })

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND)
    }
    user.password = await this.generateSaltPassword(password)
    user.recoveryPasswordToken = null
    user.recoveryPasswordTokenTries = 0

    await this.userRepository.save(user)

    return new ApiResponseDto('Contraseña actualizada', null)
  }

  private async generateSaltPassword(password: string) {
    const ROUNDS = 10
    const SALT = await genSalt(ROUNDS)

    return hash(password, SALT)
  }
}
