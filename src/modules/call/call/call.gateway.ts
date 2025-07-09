import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { QueueStatus, QueueType } from '@prisma/client';

interface QueueCallData {
  queueId: string;
  queueNumber: string;
  status: QueueStatus;
  customerName?: string | null;
  type: QueueType;
  calledAt?: Date | null;
  ttsText?: string;
  servedBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

interface QueueUpdateData {
  queueId: string;
  queueNumber: string;
  status: QueueStatus;
  customerName: string | null; // Match with database nullable field
  type: QueueType;
  servedBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
  serviceDuration?: number;
  serviceStartedAt?: Date | null;
}

interface QueueRecallData {
  queueId: string;
  queueNumber: string;
  status: QueueStatus;
  customerName?: string | null;
  type: QueueType;
  ttsText: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'call',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('CallGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);

    client.emit('joined-room', {
      success: true,
      room: data.room,
      message: `Joined room: ${data.room}`,
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);

    client.emit('left-room', {
      success: true,
      room: data.room,
      message: `Left room: ${data.room}`,
    });
  }

  // Broadcast queue call ke semua client
  broadcastQueueCall(data: QueueCallData) {
    this.server.emit('queue-called', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    // Send ke display room khusus
    this.server.to('display').emit('queue-called', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasting queue call: ${data.queueNumber}`);
  }

  // Broadcast queue update ke semua client
  broadcastQueueUpdate(data: QueueUpdateData) {
    this.server.emit('queue-updated', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    // Send ke display room khusus
    this.server.to('display').emit('queue-updated', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasting queue update: ${data.queueNumber} - ${data.status}`,
    );
  }

  // Broadcast queue recall ke semua client
  broadcastQueueRecall(data: QueueRecallData) {
    this.server.emit('queue-recalled', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    // Send ke display room khusus
    this.server.to('display').emit('queue-recalled', {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasting queue recall: ${data.queueNumber}`);
  }

  // Method untuk testing WebSocket connection
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      success: true,
      message: 'WebSocket connection is working',
      timestamp: new Date().toISOString(),
    });
  }
}
