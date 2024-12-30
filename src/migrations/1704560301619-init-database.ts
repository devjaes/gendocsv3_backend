import { MigrationInterface, QueryRunner } from 'typeorm'
import { UserEntity } from '../users/entities/users.entity'
import { ModuleEntity } from '../modules/entities/module.entity'
import { SubmoduleEntity } from '../submodules/entities/submodule.entity'
import { SubmoduleModuleEntity } from '../submodules-modules/entities/submodule-module.entity'
import { UserAccessModuleEntity } from '../users-access-modules/entities/user-access-module.entity'
import { SystemYearEntity } from '../year-module/entities/system-year.entity'

export class InitDatabase1704560301619 implements MigrationInterface {
  name?: string
  transaction?: boolean
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const userRepository = connection.getRepository(UserEntity)
    const systemYearRepository = connection.getRepository(SystemYearEntity)
    const moduleRepository = connection.getRepository(ModuleEntity)
    const submoduleRepository = connection.getRepository(SubmoduleEntity)

    const systemYear = 2024

    const adminUser = [
      {
        id: 1,
        googleEmail: 'gendocsv2@gmail.com',
        outlookEmail: 'ddlm.montenegro@uta.edu.ec',
        role: 'ADMIN',
        isActive: true,
        password:
          '$2a$12$NMywRUK4Ontc9.4Y1YYyyeTU2aUfHdv42wH6c3dls8cveUdpGo1n2',
        firstLastName: 'Montenegro',
        firstName: 'Daniela',
        secondLastName: 'Montenegro',
        secondName: 'Daniela',
      },
    ]

    const modulesToInsert = [
      {
        code: 'FACU',
        name: 'CONSEJO DIRECTIVO',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1gHKBOi4I839cmLuJINwH7-eqTowTysdX'
            : '1XoGeTqOtnWEg4dFtikDUsPCxDN7K1azp',
        defaultTemplateDriveId: '1yvyjnw88KAkOwMynHV9s1bxWa-YKZ6IOwtcunyeDKdw',
        compilationTemplateDriveId:
          '1TEiLZ1YPnLecCKeJN1OB_SuffxjQ_VEB4s45f-L42DE',
        separatorTemplateDriveId:
          '1hSDUhZA0iA2gke0dLc106IpM6aOTDUJ68ctmvDockVQ',
      },
      {
        code: 'SUDE',
        name: 'CONSEJO ACADÉMICO',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1XgA_c7bTKyyIJdKDSa4TEsJ87hzfMZzp'
            : '1EPP29edJ0usV_1ai59TYOg8FWQxsJTXy',
        defaultTemplateDriveId: '1VwfM4QSlAtyX4Rnbl_43eE-xgtUrHrKfHpXHsyZUO7s',
        separatorTemplateDriveId:
          '1qiPMotV99bfP4MMqpnOxUDc7yjFZbB0H6ETaFVbHkeY',
        compilationTemplateDriveId:
          '1k0dr8OUcCeYkZROGhI8Rz7Y3pyH89cWvIBjj1a4N1vs',
      },
      {
        code: 'SIST-UNI',
        name: 'SISTEMAS',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1255_rLR9lIsoAI1GtY6xwtCkcesAYkCO'
            : '1jUcD9Jycz3FZbpbzkz_OV1KnCJ-nxLPH',
        defaultTemplateDriveId: '1BuZN4MeMnAamaFr16JQUuOYOTYkpm7G1gvDhBmmwMUw',
        compilationTemplateDriveId:
          '1ch6YtJnHJaFzn37GzLvAWAyyYfSqrCZ3xB1I-uuyElw',
        separatorTemplateDriveId:
          '1WxWYPpYzSbquBPGeBdr7PI-qyK2q0TbDjJoY4DsmsIg',
      },
      {
        code: 'INPA-UNI',
        name: 'INDUSTRIAL EN PROCESOS',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1ozrVZQz3aKTdLlX1r9bix84YccN_peZD'
            : '1IBRuw2iYKN3Oc0muHtj7GAjWIaQrgLgz',
        defaultTemplateDriveId: '147QrYn9Cxy6p1qms0HnQD60RF_pkOdSSXzfVrE5ares',
        compilationTemplateDriveId:
          '1HNQWLaUzpWrV0bi0flEJCEXjCLJLwXUTYfFhEHiMLmw',
        separatorTemplateDriveId:
          '1ZV84qwYgx1bAzWMNueWmiJr-I2Q3wTk_hKJaIBq-IS4',
      },
      {
        code: 'ELEC-UNI',
        name: 'ELECTRÓNICA Y COMUNICACIONES',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1BYJHTFoO4j7r86XyW0Uj1mZwrG7Y-c_l'
            : '1VjBtMxtESjT8qTVkzGZGyVqAPjuF-4nE',
        defaultTemplateDriveId: '1VZxygcOXQF8FSgINMzgaJ3yQyDOL4azEKTf6zUt0lis',
        compilationTemplateDriveId:
          '1_GB_yjTjvSXXejsxTccb70IcmgMB0mUkT-FmRce_rdo',
        separatorTemplateDriveId:
          '1oB3XQJSLA7j5V-uA4KxWNTpP9J7iO7HgSHVvHUUVI_8',
      },
      {
        code: 'SOFT-UNI',
        name: 'SOFTWARE',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '12bvOhkFKew5Yg-EzDWpI6vWdEzrx3dv0'
            : '1TNGmMLeAoy-43X2BWW2q_dgT7_lM5rdN',
        defaultTemplateDriveId: '1ZTnzJAaX7wTOMapCev9Acny8EtNfBL-VIqtHy2p0eqU',
        compilationTemplateDriveId:
          '1DikFxaYHcMtRMsjTrMXx2SxuuMe1gNFMk6aCMBRbAgQ',
        separatorTemplateDriveId:
          '1vHkOw5BPKdcGRuy-8aY9G1w0Ui--Ad-mFL5mHT4shxY',
      },
      {
        code: 'TECI-UNI',
        name: 'TECNOLOGÍA DE INFORMACIÓN',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1xlcjK7ajenypmYnEm00HFCCb68Ht7Ix2'
            : '1CggaJGis8LbqugjXfct6bMpLabSyM92w',
        defaultTemplateDriveId: '1TbrRsX82BspnOFkX6b2CGqZel4q5xWq6GLuBrUHMdjM',
        compilationTemplateDriveId:
          '1Yxmnn3rB0uSGVj8AmSAqnSN0L1KLiU29O4cvUpMnlSI',
        separatorTemplateDriveId:
          '1zXogcewHhmmx3nS9tA-HczyUVbuqSVkU4KVY7gCqI38',
      },
      {
        code: 'TELE-UNI',
        name: 'TELECOMUNICACIONES',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '11NJOGq0lQzKrdLPXCR_zotFzmcpPN10s'
            : '1J-IItSC_3OQVYFVeMx_u6unZHrr4VFaY',
        defaultTemplateDriveId: '1Vuu3f6GOGhtRh4Hj2_8_PtkttLaCh9kyELs9igwcOlU',
        compilationTemplateDriveId:
          '1uhKYiPPBzzdXjjUW_W-YG51akPsujnFV0alUBOzi3qw',
        separatorTemplateDriveId:
          '1Njbz2C0zPD6tIMkSoFHEayMFLQBWeh2O98FV-NXppS4',
      },
      {
        code: 'INDS-UNI',
        name: 'INDUSTRIAL',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1ZIDpIO-M0uCYLFV-LzoXGoxSz6DxWRij'
            : '1SoitmaQHSFopOcNva7N401qIEwIpdbii',
        defaultTemplateDriveId: '1iUw4UWmx5KGWgFrPgSdB-cJAgIB4mntSOwanMU0v3c8',
        compilationTemplateDriveId:
          '1Co1nslt-AT3KF9tUExZyuO6YcEMO8datFj-iQIV9pPM',
        separatorTemplateDriveId:
          '1RDaD8Gqu2ppPonTHb0N6J7w_ClMqauQLpZtIw7arXHQ',
      },

      {
        code: 'ADMIN',
        name: 'ADMINISTRADOR',
        isActive: true,
        hasDocuments: false,
      },
      {
        code: 'COMM',
        name: 'COMUNES',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1piyr7ZHFgbQH20IfT5jDoVQgZOO-n99x'
            : '1sqYUXFoNpKSVcBt027j2RSPBkwWl70q4',
      },
      {
        id: 12,
        code: 'AURO-UNI',
        name: 'AUTOMATIZACIÓN Y ROBÓTICA',
        isActive: true,
        hasDocuments: true,
        driveId:
          `${process.env.NODE_ENV}` === 'production'
            ? '1rUYtukt9Cpfiha9tt_3irbW_q-j7SNFk'
            : '19AA6Y7ioDQS1iR9GCzz1h916urUEfleB',
        defaultTemplateDriveId: '1n6lAV85y7_XFeNI6EENXPX3BwOxG3HA_n0d3Op5XEGE',
        compilationTemplateDriveId:
          '1c8m75uN4fZ35sFZZydRLs3qRN4vkool6f2Uywp-s3bk',
        separatorTemplateDriveId:
          '1WuoXCV76OTXxx97WPDFLJmnfxM-ndbu4YuxNjEwahc0',
      },
    ]

    const subModulesToInsert = [
      { name: 'Consejos' },
      { name: 'Procesos' },
      { name: 'Documentos' },
      { name: 'Estudiantes' },
      { name: 'Funcionarios' },
      { name: 'Carreras' },
      { name: 'Usuarios' },
      { name: 'Actas de grado' },
      { name: 'Cargos' },
    ]

    const queryRunner2 = connection.createQueryRunner()
    await queryRunner2.connect()
    await queryRunner2.startTransaction()

    await queryRunner2.manager.save(
      systemYearRepository.create({ currentYear: systemYear }),
    )

    await queryRunner2.manager.save(
      adminUser.map((u) => userRepository.create(u as UserEntity)),
    )
    await queryRunner2.manager.save(
      modulesToInsert.map((m) => moduleRepository.create(m)),
    )
    await queryRunner2.manager.save(
      subModulesToInsert.map((m) => submoduleRepository.create(m)),
    )

    await queryRunner2.commitTransaction()

    await queryRunner2.release()
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const userRepository = connection.getRepository(UserEntity)
    const systemYearRepository = connection.getRepository(SystemYearEntity)
    const moduleRepository = connection.getRepository(ModuleEntity)
    const submoduleRepository = connection.getRepository(SubmoduleEntity)
    const submodulesModuleRepository = connection.getRepository(
      SubmoduleModuleEntity,
    )
    const userAccessModuleRepository = connection.getRepository(
      UserAccessModuleEntity,
    )

    await userRepository.delete({})
    await systemYearRepository.delete({})
    await moduleRepository.delete({})
    await submoduleRepository.delete({})
    await submodulesModuleRepository.delete({})
    await userAccessModuleRepository.delete({})
  }
}
