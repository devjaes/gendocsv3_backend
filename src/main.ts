import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as bodyParser from 'body-parser'
import { ConfigService } from '@nestjs/config'
import { Logger, ValidationPipe } from '@nestjs/common'
import { HttpExceptionsMiddleware } from './core/middleware/http-exception'
import * as heapdump from 'heapdump'

const buildOptions = () =>
  new DocumentBuilder()
    .setTitle('GenDocs API')
    .setDescription('GenDocs API documentation')
    .setVersion('3.0')
    .addBearerAuth()
    .build()

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })
  const logger = new Logger('Bootstrap')

  app.use(bodyParser.json({ limit: '10mb' }))
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionsMiddleware())
  app.enableShutdownHooks()
  app.enableCors({
    credentials: true,
    origin: true,
    exposedHeaders: ['Set-Cookie'],
  })

  const options = buildOptions()
  const document = SwaggerModule.createDocument(app, options)
  SwaggerModule.setup('api', app, document)

  const MB = 1024 * 1024
  setInterval(() => {
    const memory = process.memoryUsage()
    if (memory.heapUsed > 2000 * MB) {
      // 2GB
      heapdump.writeSnapshot(`./heapdump-${Date.now()}.heapsnapshot`)
    }
  }, 60000) // Revisar cada minuto
  await app.listen(app.get(ConfigService).get('port'))
  logger.log(
    `Application listening on port ${app.get(ConfigService).get('port')}`,
  )
}

bootstrap()
