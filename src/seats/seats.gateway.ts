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

  @SubscribeMessage('leave-show')
  leaveShow(@MessageBody() showId: string, @ConnectedSocket() client: Socket) {
    void client.leave(`show:${showId}`);
  }

  notifySeatBooked(showId: string, showSeatIds: string[]) {
    this.server.to(`show:${showId}`).emit('seats-booked', {
      showSeatIds,
    });
  }

  notifySeatsHeld(showId: string, showSeatIds: string[]) {
    this.server.to(`show:${showId}`).emit('seats-held', {
      showSeatIds,
    });
  }

  notifySeatsReleased(showId: string, showSeatIds: string[]) {
    this.server.to(`show:${showId}`).emit('seats-released', {
      showSeatIds,
    });
  }
}
