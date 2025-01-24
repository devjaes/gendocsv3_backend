import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { DataSource } from 'typeorm'

@Injectable()
export class DatabaseCleanupService {
  private readonly logger = new Logger(DatabaseCleanupService.name)

  constructor(private dataSource: DataSource) {}

  @Cron('0 */4 * * *') // Cada 4 horas
  async cleanup() {
    try {
      // Cierra todas las conexiones activas
      await this.dataSource.destroy()

      // Limpia la memoria del proceso
      if (global.gc) {
        global.gc()
      }

      // Reinicia el pool de conexiones
      await this.dataSource.initialize()

      this.logger.log('Limpieza completada exitosamente')
    } catch (error) {
      this.logger.error('Error durante la limpieza:', error)
    }
  }
}
