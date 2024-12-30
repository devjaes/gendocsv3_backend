import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import * as util from 'util'

@Catch()
export class HttpExceptionsMiddleware implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionsMiddleware.name)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()
    const { method, url, headers, body } = request

    this.logger.error(
      'Request:',
      util.inspect(
        {
          method,
          url,
          headers,
          body,
          exception,
        },
        { depth: null, colors: true },
      ),
    )

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    response.status(status).json({
      statusCode: status,
      type:
        exception.response?.type || exception.response?.type || exception.name,
      title:
        exception.response?.title ||
        exception.title ||
        exception.name === 'BadRequestException'
          ? 'Petición incorrecta'
          : exception.name || 'Internal Server Error',
      message:
        exception.response?.detail ||
        exception.detail ||
        exception.response?.message ||
        exception.message ||
        'Internal Server Error',
      error: exception.name,
    })
  }
}
