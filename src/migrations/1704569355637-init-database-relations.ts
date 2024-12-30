import { MigrationInterface, QueryRunner } from 'typeorm'
import { UserAccessModuleEntity } from '../users-access-modules/entities/user-access-module.entity'
import { SubmoduleModuleEntity } from '../submodules-modules/entities/submodule-module.entity'

export class InitDatabaseRelations1704569355637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const submodulesModuleRepository = connection.getRepository(
      SubmoduleModuleEntity,
    )
    const userAccessModuleRepository = connection.getRepository(
      UserAccessModuleEntity,
    )

    const modulesAndSubModulesRelationsToInsert = [
      { moduleId: 1, submoduleId: 1 },
      {
        submoduleId: 2,
        moduleId: 1,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1amspmIrZ_3rF2VrUvavEHdoRl8ZJefrB'
            : '1nOk40HGSAvN6QgbJfin7VFsZCHMpbmKT',
      },
      { submoduleId: 3, moduleId: 1 },
      { submoduleId: 1, moduleId: 2 },
      {
        submoduleId: 2,
        moduleId: 2,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1rkc0aI99b60WLw8uspp8gNpe4QhMlpG9'
            : '1s920jR4Rbcf2JOK1-eXfMzjmV31zDVar',
      },
      { submoduleId: 3, moduleId: 2 },
      { submoduleId: 1, moduleId: 3 },
      {
        submoduleId: 2,
        moduleId: 3,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1d9IpJjwRYwXq54aHEMGEcMWiVUB6QVH2'
            : '1h1KTA_--5VPh_r6tHQj9ig-hEGf4ko_3',
      },
      { submoduleId: 3, moduleId: 3 },
      { submoduleId: 1, moduleId: 4 },
      {
        submoduleId: 2,
        moduleId: 4,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1OeTzBDDff1HhQMhkDi87oyQYeDXz23A7'
            : '1vqNH8ysvQGIrX_4aGiu15dw91bLFPdp3',
      },
      { submoduleId: 3, moduleId: 4 },
      { submoduleId: 1, moduleId: 5 },
      {
        submoduleId: 2,
        moduleId: 5,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1f1bKMbE9oQc0jMpwPeHa0NpgOLNSoVcc'
            : '1SE_YzWZxsnGO_JJJpOlQFvQ2aXpQEtnD',
      },
      { submoduleId: 3, moduleId: 5 },
      { submoduleId: 1, moduleId: 6 },
      {
        submoduleId: 2,
        moduleId: 6,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1ZbkBRLckfGCc8me7vjg46doQiz-pUvVR'
            : '1tQntjbMg0Pp7Ljxmr0HtSYgGTilY_pFy',
      },
      { submoduleId: 3, moduleId: 6 },
      { submoduleId: 1, moduleId: 7 },
      {
        submoduleId: 2,
        moduleId: 7,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1ZQhd1W6OdvpAbUx9Ph6AjOnPFRjCccNF'
            : '1ADDu_53Z6uhQtWUiLuPAHdQA4GHQ5cKX',
      },
      { submoduleId: 3, moduleId: 7 },
      { submoduleId: 1, moduleId: 8 },
      {
        submoduleId: 2,
        moduleId: 8,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1IPM_XQVoZRa9bRhVffkaAK4nfdc_IWIQ'
            : '1M67kzEjDkmaIlbbaMf9g8petu_w8hLzq',
      },
      { submoduleId: 3, moduleId: 8 },
      { submoduleId: 1, moduleId: 9 },
      {
        submoduleId: 2,
        moduleId: 9,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1YrLWFQYDXZUnq_5ciTMcpONnT9yJfEWi'
            : '1DJlzVzRCqelc1o4wUNRXp_5swm1ynIa6',
      },
      { submoduleId: 3, moduleId: 9 },
      { submoduleId: 5, moduleId: 10 },
      { submoduleId: 6, moduleId: 10 },
      { submoduleId: 7, moduleId: 10 },
      { submoduleId: 9, moduleId: 10 },
      { submoduleId: 8, moduleId: 11 },
      { submoduleId: 4, moduleId: 11 },
      { submoduleId: 1, moduleId: 12 },
      {
        submoduleId: 2,
        moduleId: 12,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1_vBGsHIIxCGTo7V8fuUVphaKX-Yc3qcM'
            : '1JQaM9HyFDwIuvteeiwnttU5TZ3ajzy8M',
      },
      { submoduleId: 3, moduleId: 12 },
    ]

    const userAccessModuleToInsert = [
      { userId: 1, moduleId: 1 },
      { userId: 1, moduleId: 2 },
      { userId: 1, moduleId: 3 },
      { userId: 1, moduleId: 4 },
      { userId: 1, moduleId: 5 },
      { userId: 1, moduleId: 6 },
      { userId: 1, moduleId: 7 },
      { userId: 1, moduleId: 8 },
      { userId: 1, moduleId: 9 },
      { userId: 1, moduleId: 10 },
      { userId: 1, moduleId: 11 },
      { userId: 1, moduleId: 12 },
    ]

    const queryRunner2 = connection.createQueryRunner()
    await queryRunner2.connect()
    await queryRunner2.startTransaction()

    await queryRunner2.manager.save(
      modulesAndSubModulesRelationsToInsert.map((m) =>
        submodulesModuleRepository.create(m),
      ),
    )
    await queryRunner2.manager.save(
      userAccessModuleToInsert.map((m) => userAccessModuleRepository.create(m)),
    )

    await queryRunner2.commitTransaction()
    await queryRunner2.release()
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const submodulesModuleRepository = connection.getRepository(
      SubmoduleModuleEntity,
    )
    const userAccessModuleRepository = connection.getRepository(
      UserAccessModuleEntity,
    )

    await submodulesModuleRepository.delete({})
    await userAccessModuleRepository.delete({})
  }
}
