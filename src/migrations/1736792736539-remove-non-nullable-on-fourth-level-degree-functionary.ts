import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveNonNullableOnFourthLevelDegreeFunctionary1736792736539
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const query =
      'ALTER TABLE functionaries ALTER COLUMN fourth_level_degree_id DROP NOT NULL'
    await queryRunner.query(query)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query =
      'ALTER TABLE functionaries ALTER COLUMN fourth_level_degree_id SET NOT NULL'
    await queryRunner.query(query)
  }
}
