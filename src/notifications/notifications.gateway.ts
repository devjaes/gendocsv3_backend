import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server } from 'socket.io'
import { Catch, HttpException, Logger, UseFilters } from '@nestjs/common'
import { NotificationEntity } from './entities/notification.entity'
import { NotificationsService } from './notifications.service'

@Catch(WsException, HttpException)
class WsAndHttpExceptionFilter {
  // public catch(exception: HttpException, host: ArgumentsHost) {
  public catch(exception: WsException) {
    Logger.error('An error occurred in the WebSocket connection:', exception)
    throw exception
  }
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway {
  constructor(private readonly notificationsService: NotificationsService) {}

  @WebSocketServer()
  server: Server

  @UseFilters(WsAndHttpExceptionFilter)
  handleSendNotification(
    @MessageBody()
    data:
      | NotificationEntity
      | { notification: NotificationEntity; childs: NotificationEntity[] },
  ): void {
    if (data instanceof NotificationEntity) {
      this.server.emit('notification', {
        notification: data,
        childs: [],
      })
      return
    }
    this.server.emit('notification', data)
  }

  @UseFilters(WsAndHttpExceptionFilter)
  handleSendWarning(
    @MessageBody()
    data: {
      message: string
      title: string
    },
  ): void {
    this.server.emit('warning', data)
  }

  @SubscribeMessage('user-notifications')
  async handleUserNotifications(
    @MessageBody() { userId, limit = 10 }: { userId: number; limit?: number },
  ) {
    if (userId === 0) return
    const notifications =
      await this.notificationsService.findAllAvailableForUser(userId, limit)

    this.server.emit('user-notifications', notifications)
  }
}
