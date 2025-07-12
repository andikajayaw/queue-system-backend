import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DisplayService } from '../display.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/display',
})
export class DisplayGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('DisplayGateway');

  constructor(private displayService: DisplayService) {}

  afterInit(server: Server) {
    this.logger.log('Display WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Display client connected: ${client.id}`);

    // Send initial data when client connects
    await this.sendInitialData(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Display client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    this.logger.log(`Client Display ${client.id} joined room: ${data.room}`);

    client.emit('joined-room', {
      success: true,
      room: data.room,
      message: `Joined room: ${data.room}`,
    });

    await this.sendInitialData(client);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.logger.log(`Client Display ${client.id} left room: ${data.room}`);

    client.emit('left-room', {
      success: true,
      room: data.room,
      message: `Left room: ${data.room}`,
    });
  }

  private async sendInitialData(client: Socket) {
    try {
      const [
        currentCalled,
        statistics,
        recentCompleted,
        nextWaiting,
        dashboardStats,
      ] = await Promise.all([
        this.displayService.getCurrentCalledQueues(),
        this.displayService.getQueueStatistics(),
        this.displayService.getRecentCompletedQueues(10),
        this.displayService.getNextWaitingQueues(5),
        this.displayService.getDashboardStats(),
      ]);

      client.emit('currentCalled', currentCalled);
      client.emit('statistics', statistics);
      client.emit('recentCompleted', recentCompleted);
      client.emit('nextWaiting', nextWaiting);
      client.emit('dashboardStats', dashboardStats);
    } catch (error) {
      this.logger.error('Error sending initial data:', error);
    }
  }

  // Method to broadcast queue call updates
  async broadcastQueueCalled(queueData: any) {
    try {
      const currentCalled = await this.displayService.getCurrentCalledQueues();
      const statistics = await this.displayService.getQueueStatistics();
      const nextWaiting = await this.displayService.getNextWaitingQueues(5);

      this.server.emit('queueCalled', {
        queue: queueData,
        currentCalled,
        statistics,
        nextWaiting,
      });

      this.logger.log(`Broadcasted queue called: ${queueData.queueNumber}`);
    } catch (error) {
      this.logger.error('Error broadcasting queue called:', error);
    }
  }

  // Method to broadcast queue completion updates
  async broadcastQueueCompleted(queueData: any) {
    try {
      const [currentCalled, statistics, recentCompleted, nextWaiting] =
        await Promise.all([
          this.displayService.getCurrentCalledQueues(),
          this.displayService.getQueueStatistics(),
          this.displayService.getRecentCompletedQueues(10),
          this.displayService.getNextWaitingQueues(5),
        ]);

      this.server.emit('queueCompleted', {
        queue: queueData,
        currentCalled,
        statistics,
        recentCompleted,
        nextWaiting,
      });

      this.logger.log(`Broadcasted queue completed: ${queueData.queueNumber}`);
    } catch (error) {
      this.logger.error('Error broadcasting queue completed:', error);
    }
  }

  // Method to broadcast queue serving updates
  async broadcastQueueServing(queueData: any) {
    try {
      const [currentCalled, statistics] = await Promise.all([
        this.displayService.getCurrentCalledQueues(),
        this.displayService.getQueueStatistics(),
      ]);

      this.server.emit('queueServing', {
        queue: queueData,
        currentCalled,
        statistics,
      });

      this.logger.log(`Broadcasted queue serving: ${queueData.queueNumber}`);
    } catch (error) {
      this.logger.error('Error broadcasting queue serving:', error);
    }
  }

  // Method to broadcast new queue creation
  async broadcastNewQueue(queueData: any) {
    try {
      const [currentCalled, statistics, nextWaiting] = await Promise.all([
        this.displayService.getCurrentCalledQueues(),
        this.displayService.getQueueStatistics(),
        this.displayService.getNextWaitingQueues(5),
      ]);
      this.server.emit('newQueue', {
        queue: queueData,
        currentCalled,
        statistics,
        nextWaiting,
      });
      // this.server.to('display').emit('newQueue', {
      //   queue: queueData,
      //   statistics,
      //   nextWaiting,
      // });

      this.logger.log(`Broadcasted new queue: ${queueData.queueNumber}`);
    } catch (error) {
      this.logger.error('Error broadcasting new queue:', error);
    }
  }

  // Method to broadcast queue cancellation
  async broadcastQueueCancelled(queueData: any) {
    try {
      const [currentCalled, statistics, nextWaiting] = await Promise.all([
        this.displayService.getCurrentCalledQueues(),
        this.displayService.getQueueStatistics(),
        this.displayService.getNextWaitingQueues(5),
      ]);

      this.server.emit('queueCancelled', {
        queue: queueData,
        currentCalled,
        statistics,
        nextWaiting,
      });

      this.logger.log(`Broadcasted queue cancelled: ${queueData.queueNumber}`);
    } catch (error) {
      this.logger.error('Error broadcasting queue cancelled:', error);
    }
  }

  // Method to refresh all display data
  async refreshDisplayData() {
    try {
      const [currentCalled, statistics, recentCompleted, nextWaiting] =
        await Promise.all([
          this.displayService.getCurrentCalledQueues(),
          this.displayService.getQueueStatistics(),
          this.displayService.getRecentCompletedQueues(10),
          this.displayService.getNextWaitingQueues(5),
        ]);

      this.server.emit('dataRefresh', {
        currentCalled,
        statistics,
        recentCompleted,
        nextWaiting,
      });

      this.logger.log('Refreshed display data for all clients');
    } catch (error) {
      this.logger.error('Error refreshing display data:', error);
    }
  }

  async broadcastWaitingByDate(queueDate: Date, limit: number = 10) {
    try {
      const waitingQueues = await this.displayService.getWaitingQueuesByDate(
        queueDate,
        limit,
      );

      this.server.emit('waitingByDateUpdate', {
        queueDate: queueDate.toISOString().split('T')[0],
        data: waitingQueues,
        count: waitingQueues.length,
      });

      this.logger.log(
        `Broadcasted waiting queues by date ${queueDate.toISOString().split('T')[0]} to all clients`,
      );
    } catch (error) {
      this.logger.error('Error broadcasting waiting queues by date:', error);
    }
  }
}
