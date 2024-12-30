import {
  MessageBody,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server } from 'socket.io'
import { Catch, HttpException, Logger, UseFilters } from '@nestjs/common'
import { UserEntity } from './entities/users.entity'
import { UpdateUserDTO } from './dto/update-user.dto'

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
export class UsersGateway {
  @WebSocketServer()
  server: Server

  @UseFilters(WsAndHttpExceptionFilter)
  handleChangeAccessModules(
    @MessageBody()
    data: {
      id: number
      accessModules: number[]
    },
  ): void {
    this.server.emit('change-access-modules', data)
  }

  @UseFilters(WsAndHttpExceptionFilter)
  handleChangeUser(
    @MessageBody()
    data: {
      id: number
      user: Partial<UserEntity | UpdateUserDTO>
    },
  ): void {
    this.server.emit('change-user', data)
  }
}
