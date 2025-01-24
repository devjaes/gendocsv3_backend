import { Module } from '@nestjs/common'
import { DatabaseCleanupService } from './database-cleanup.service'

@Module({
  providers: [DatabaseCleanupService],
})
export class PerformanceModule {}
