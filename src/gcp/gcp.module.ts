import { Module } from '@nestjs/common'
import { GcpService } from './gcp.service'
import { ConfigModule } from '@nestjs/config'
import { GcpController } from './gcp.controller'
import { GcpMToolService } from './gcp-mtool.service'

@Module({
  providers: [GcpService, GcpMToolService],
  controllers: [GcpController],
  exports: [GcpService, GcpMToolService],
  imports: [ConfigModule],
})
export class GcpModule {}
