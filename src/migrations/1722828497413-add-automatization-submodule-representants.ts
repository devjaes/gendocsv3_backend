import { MigrationInterface, QueryRunner } from 'typeorm'
import { SubmoduleModuleEntity } from '../submodules-modules/entities/submodule-module.entity'

/**
 * This migration adds the submodule-module relations for the automatization
 *
 * @author Pablo Villacres
 */
export class AddAutomatizationSubmoduleRepresentants1722828497413
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const submodulesModuleRepository = connection.getRepository(
      SubmoduleModuleEntity,
    )

    const modulesAndSubModulesRelationsToInsert = [
      { moduleId: 12, submoduleId: 10 },
    ]

    const queryRunner2 = connection.createQueryRunner()
    await queryRunner2.connect()
    await queryRunner2.startTransaction()

    await queryRunner2.manager.save(
      modulesAndSubModulesRelationsToInsert.map((m) =>
        submodulesModuleRepository.create(m),
      ),
    )

    await queryRunner2.commitTransaction()
    await queryRunner2.release()
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const submodulesModuleRepository = connection.getRepository(
      SubmoduleModuleEntity,
    )

    await submodulesModuleRepository.delete({})
  }
}
