import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { UserAccessModuleEntity } from './entities/user-access-module.entity'
import { DataSource, Repository } from 'typeorm'
import { CreateUserAccessModuleDto } from './dto/create-user-access-module.dto'
import { ModuleEntity } from '../modules/entities/module.entity'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { UserAccessCareerDegCertEntity } from './entities/user-access-careers-deg-cert.entity'
import { CareerEntity } from '../careers/entites/careers.entity'

@Injectable()
export class UserAccessModulesService {
  constructor(
    @InjectRepository(UserAccessModuleEntity)
    private userAccessModulesRepository: Repository<UserAccessModuleEntity>,

    private dataSource: DataSource,
  ) {}

  async create(createUserAccessModuleDto: CreateUserAccessModuleDto) {
    try {
      const { userId, modulesIds } = createUserAccessModuleDto

      const userAccessModules: UserAccessModuleEntity[] = []
      const modules: ModuleEntity[] = []

      for (const moduleId of modulesIds) {
        const userAccessModuleCreated = this.userAccessModulesRepository.create(
          {
            userId,
            moduleId,
          },
        )

        if (!userAccessModuleCreated) {
          throw new HttpException(
            'UserAccessModule not created',
            HttpStatus.CONFLICT,
          )
        }

        const userAccessModule = await this.userAccessModulesRepository.save(
          userAccessModuleCreated,
        )

        const module = await this.dataSource
          .createQueryBuilder()
          .select('module')
          .from(ModuleEntity, 'module')
          .where('module.id = :moduleId', { moduleId })
          .getOne()

        if (!module) {
          throw new HttpException(
            'Module to asign not found',
            HttpStatus.NOT_FOUND,
          )
        }

        modules.push(module)
        userAccessModules.push(userAccessModule)
      }

      return new ApiResponseDto('Acceso a usuarios creado correctamente', {
        userAccessModules,
        modules,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async update(createUserAccessModuleDto: CreateUserAccessModuleDto) {
    const { userId, modulesIds } = createUserAccessModuleDto
    const modules: ModuleEntity[] = []

    const userAccessModules: UserAccessModuleEntity[] = []
    try {
      const user = await this.dataSource
        .createQueryBuilder()
        .select('user')
        .from('users', 'user')
        .where('user.id = :userId', { userId })
        .getOne()

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND)
      }

      await this.userAccessModulesRepository.delete({
        userId,
      })

      for (const moduleId of modulesIds) {
        const userAccessModuleCreated = this.userAccessModulesRepository.create(
          {
            userId,
            moduleId,
          },
        )

        if (!userAccessModuleCreated) {
          throw new HttpException(
            'UserAccessModule not created',
            HttpStatus.CONFLICT,
          )
        }

        const userAccessModule = await this.userAccessModulesRepository.save(
          userAccessModuleCreated,
        )

        const module = await this.dataSource
          .createQueryBuilder()
          .select('module')
          .from(ModuleEntity, 'module')
          .where('module.id = :moduleId', { moduleId })
          .getOne()

        if (!module) {
          throw new HttpException(
            'Module to asign not found',
            HttpStatus.NOT_FOUND,
          )
        }

        modules.push(module)

        userAccessModules.push(userAccessModule)
      }

      return new ApiResponseDto('Acceso a usuarios actualizado correctamente', {
        userAccessModules,
        modules,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async createCareerAccessDegCert({
    userId,
    careerIds,
  }: {
    userId: number
    careerIds: number[]
  }) {
    try {
      const userAccessCareerDegCertEntities: UserAccessCareerDegCertEntity[] =
        []
      const careers: CareerEntity[] = []

      for (const careerId of careerIds) {
        const career = await this.dataSource
          .createQueryBuilder()
          .select('career')
          .from(CareerEntity, 'career')
          .where('career.id = :careerId', { careerId })
          .getOne()

        if (!career) {
          throw new HttpException('Carrera no encontrada', HttpStatus.NOT_FOUND)
        }

        const userAccessCareerCreated = UserAccessCareerDegCertEntity.create({
          userId,
          careerId,
        })

        if (!userAccessCareerCreated) {
          throw new HttpException(
            'Las carreras no se pudieron asignar',
            HttpStatus.CONFLICT,
          )
        }

        const userAccessCarrer = await UserAccessCareerDegCertEntity.save(
          userAccessCareerCreated,
        )

        careers.push(career)
        userAccessCareerDegCertEntities.push(userAccessCarrer)
      }

      return new ApiResponseDto('Acceso a usuarios creado correctamente', {
        userAccessCareers: userAccessCareerDegCertEntities,
        careers,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async updateCareerAccessDegCert({
    userId,
    careerIds,
  }: {
    userId: number
    careerIds: number[]
  }) {
    try {
      const user = await this.dataSource
        .createQueryBuilder()
        .select('user')
        .from('users', 'user')
        .where('user.id = :userId', { userId })
        .getOne()

      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND)
      }

      await this.dataSource
        .createQueryBuilder()
        .delete()
        .from(UserAccessCareerDegCertEntity)
        .where('userId = :userId', { userId })
        .execute()

      const userAccessCareerDegCertEntities: UserAccessCareerDegCertEntity[] =
        []
      const careers: CareerEntity[] = []

      for (const careerId of careerIds) {
        const career = await this.dataSource
          .createQueryBuilder()
          .select('career')
          .from(CareerEntity, 'career')
          .where('career.id = :careerId', { careerId })
          .getOne()

        if (!career) {
          throw new HttpException('Carrera no encontrada', HttpStatus.NOT_FOUND)
        }

        const userAccessCareerCreated = UserAccessCareerDegCertEntity.create({
          userId,
          careerId,
        })

        if (!userAccessCareerCreated) {
          throw new HttpException(
            'Las carreras no se pudieron asignar',
            HttpStatus.CONFLICT,
          )
        }

        const userAccessCarrer = await UserAccessCareerDegCertEntity.save(
          userAccessCareerCreated,
        )

        careers.push(career)
        userAccessCareerDegCertEntities.push(userAccessCarrer)
      }

      return new ApiResponseDto('Acceso a usuarios actualizado correctamente', {
        userAccessCareers: userAccessCareerDegCertEntities,
        careers,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findAll() {
    try {
      const userAccessModules = await this.userAccessModulesRepository.find()

      if (!userAccessModules) {
        throw new HttpException(
          'UserAccessModules not found',
          HttpStatus.NOT_FOUND,
        )
      }

      return new ApiResponseDto(
        'Lista de accesos a usuarios',
        userAccessModules,
      )
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findModulesByUserId(userId: string) {
    try {
      const userAccessModules = await this.dataSource
        .createQueryBuilder()
        .select('module')
        .from(ModuleEntity, 'module')
        .innerJoin('users_access_modules', 'uam', 'uam.module_id = module.id')
        .where('uam.user_id = :userId', { userId })
        .getMany()

      if (!userAccessModules) {
        throw new HttpException(
          'UserAccessModules not found',
          HttpStatus.NOT_FOUND,
        )
      }

      return new ApiResponseDto(
        'Listado de modulos por usuario',
        userAccessModules,
      )
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async remove(userId: number, moduleId: number) {
    try {
      const userAccessModule = await this.userAccessModulesRepository.findOne({
        where: {
          userId,
          moduleId,
        },
      })

      if (!userAccessModule) {
        throw new HttpException(
          'UserAccessModule not found',
          HttpStatus.NOT_FOUND,
        )
      }

      await this.userAccessModulesRepository.remove(userAccessModule)

      return new ApiResponseDto('Acceso a usuario eliminado correctamente', {
        success: true,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async removeByUserId(userId: string) {
    try {
      const qb = this.dataSource.createQueryBuilder()
      await qb
        .delete()
        .from(UserAccessModuleEntity)
        .where('userId = :userId', { userId })
        .execute()

      return new ApiResponseDto('Accesos a usuario eliminados correctamente', {
        success: true,
      })
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
