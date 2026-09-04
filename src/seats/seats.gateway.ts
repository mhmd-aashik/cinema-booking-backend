import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SeatsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-show')
  joinShow(@MessageBody() showId: string, @ConnectedSocket() client: Socket) {
    void client.join(`show:${showId}`);
  }

  notifySeatBooked(showId: string, showSeatIds: string[]) {
    this.server.to(`show:${showId}`).emit('seats-booked', {
      showSeatIds,
    });
  }
}
