import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIndexOrderToDocumentFunctionaries1736524227308
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const query = `
        ALTER TABLE document_functionaries
        ADD COLUMN IF NOT EXISTS "order" INT;
    `

    await queryRunner.query(query)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query = `
        ALTER TABLE document_functionaries
        DROP COLUMN IF EXISTS "order";
    `

    await queryRunner.query(query)
  }
}
