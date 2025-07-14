import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { QueueStatus } from '@prisma/client';
import { CallGateway } from './call/call.gateway';
import { DisplayGateway } from '../display/display/display.gateway';
import { startOfDay, endOfDay } from 'date-fns';

export interface TTSResponse {
  success: boolean;
  message: string;
  data: {
    queueNumber: string;
    text: string;
    audioUrl?: string;
    timestamp: string;
  };
}

@Injectable()
export class CallService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private callGateway: CallGateway,
    private displayGateway: DisplayGateway,
  ) {}

  async callQueue(queueId: string, staffId: string): Promise<TTSResponse> {
    // Validate queue exists and is in WAITING status
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    if (queue.status !== QueueStatus.WAITING) {
      throw new BadRequestException('Antrian tidak dalam status menunggu');
    }

    // Validate staff exists
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    // Update status ke CALLED
    const updatedQueue = await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        status: 'CALLED',
        servedById: staffId,
        calledAt: new Date(),
      },
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // Generate text untuk TTS
    const ttsText = this.generateTTSText(updatedQueue.queueNumber);

    const queueData = {
      queueId: updatedQueue.id,
      queueNumber: updatedQueue.queueNumber,
      status: updatedQueue.status,
      customerName: updatedQueue.customerName,
      type: updatedQueue.type,
      calledAt: updatedQueue.calledAt,
      ttsText,
      servedBy: updatedQueue.servedBy,
    };

    // Broadcast via WebSocket
    this.callGateway.broadcastQueueCall(queueData);

    // Broadcast to display clients
    await this.displayGateway.broadcastQueueCalled(queueData);

    // Response untuk TTS
    const response: TTSResponse = {
      success: true,
      message: `Nomor antrian ${updatedQueue.queueNumber} berhasil dipanggil`,
      data: {
        ...queueData,
        queueNumber: updatedQueue.queueNumber,
        text: ttsText,
        timestamp: new Date().toISOString(),
      },
    };

    return response;
  }

  async callNextQueue(staffId: string): Promise<TTSResponse> {
    const nextQueue = await this.queueService.getNextQueueByPriority();

    if (!nextQueue) {
      console.warn('Tidak ada antrian waiting yang valid untuk dipanggil.');
      return {
        success: false,
        message: 'Tidak ada antrian yang menunggu',
        data: {
          queueNumber: '',
          text: '',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // return this.callQueue(nextQueue.id, staffId);
    try {
      // Lindungi proses update status queue agar atomic
      const updatedQueue = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.queue.findUnique({
          where: { id: nextQueue.id },
          select: { status: true },
        });

        if (!existing || existing.status !== QueueStatus.WAITING) {
          throw new Error('Queue sudah dipanggil oleh petugas lain');
        }

        return await tx.queue.update({
          where: { id: nextQueue.id },
          data: {
            status: QueueStatus.CALLED,
            servedById: staffId,
            calledAt: new Date(),
          },
          include: {
            servedBy: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        });
      });

      // Broadcast seperti biasa
      const ttsText = this.generateTTSText(updatedQueue.queueNumber);

      const queueData = {
        queueId: updatedQueue.id,
        queueNumber: updatedQueue.queueNumber,
        status: updatedQueue.status,
        customerName: updatedQueue.customerName,
        type: updatedQueue.type,
        calledAt: updatedQueue.calledAt,
        ttsText,
        staff: updatedQueue.servedBy,
      };

      this.callGateway.broadcastQueueCall(queueData);
      await this.displayGateway.broadcastQueueCalled(queueData);

      return {
        success: true,
        message: `Nomor antrian ${updatedQueue.queueNumber} berhasil dipanggil`,
        data: {
          ...queueData,
          text: ttsText,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      return {
        success: false,
        message:
          'Antrian sudah dipanggil oleh petugas lain. Coba klik tombol lagi.',
        data: {
          queueNumber: '',
          text: '',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async callQueueByNumber(
    queueNumber: string,
    staffId: string,
  ): Promise<TTSResponse> {
    const queue = await this.prisma.queue.findFirst({
      where: {
        queueNumber,
        queueDate: {
          gte: startOfDay(new Date()),
          lt: endOfDay(new Date()),
        },
      },
    });
    // const queue = await this.prisma.queue.findUnique({
    //   where: { queueNumber, queueDate: new Date(), },
    // });

    if (!queue) {
      throw new NotFoundException('Nomor antrian tidak ditemukan');
    }

    return this.callQueue(queue.id, staffId);
  }

  async markAsServing(queueId: string, staffId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    if (queue.status !== QueueStatus.CALLED) {
      throw new BadRequestException(
        'Antrian harus dalam status dipanggil terlebih dahulu',
      );
    }

    const updatedQueue = await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.SERVING,
        servedById: staffId,
        serviceStartedAt: new Date(),
      },
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const queueData = {
      queueId: updatedQueue.id,
      queueNumber: updatedQueue.queueNumber,
      status: QueueStatus.SERVING,
      customerName: updatedQueue.customerName,
      type: updatedQueue.type,
      servedBy: updatedQueue.servedBy,
      serviceStartedAt: updatedQueue.serviceStartedAt,
    };

    // Broadcast via WebSocket
    await this.callGateway.broadcastQueueUpdate(queueData);

    // Broadcast to display clients
    await this.displayGateway.broadcastQueueServing(queueData);

    return {
      success: true,
      message: `Antrian ${updatedQueue.queueNumber} sedang dilayani oleh ${updatedQueue.servedBy?.name}`,
      data: updatedQueue,
    };
  }

  async markAsCompleted(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    // if (queue.status !== QueueStatus.SERVING) {
    //   throw new BadRequestException(
    //     'Antrian harus dalam status dilayani terlebih dahulu',
    //   );
    // }

    // Calculate service duration
    const serviceStarted = queue.serviceStartedAt;
    const serviceDuration = serviceStarted
      ? Math.floor((Date.now() - serviceStarted.getTime()) / 1000)
      : null;

    const updatedQueue = await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.COMPLETED,
        completedAt: new Date(),
        serviceDuration,
      },
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const queueData = {
      queueId: updatedQueue.id,
      queueNumber: updatedQueue.queueNumber,
      status: QueueStatus.COMPLETED,
      customerName: updatedQueue.customerName,
      type: updatedQueue.type,
      servedBy: updatedQueue.servedBy,
    };

    // Broadcast via WebSocket
    await this.callGateway.broadcastQueueUpdate(queueData);

    // Broadcast to display clients
    await this.displayGateway.broadcastQueueCompleted(queueData);

    return {
      success: true,
      message: `Antrian ${updatedQueue.queueNumber} telah selesai (${serviceDuration}s)`,
      data: updatedQueue,
    };
  }

  async skipQueue(queueId: string, staffId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
      return;
    }

    if (queue.status === 'COMPLETED' || queue.status === 'CANCELLED') {
      throw new BadRequestException('Queue is already completed or cancelled');
      return;
    }

    if (queue.servedById && queue.servedById !== staffId) {
      throw new BadRequestException('You are not assigned to this queue');
      return;
    }

    const updatedQueue = await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.CANCELLED,
        updatedAt: new Date(),
      },
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const queueData = {
      queueId: updatedQueue.id,
      queueNumber: updatedQueue.queueNumber,
      status: QueueStatus.CANCELLED,
      customerName: updatedQueue.customerName,
      type: updatedQueue.type,
      servedBy: updatedQueue.servedBy,
    };

    // Broadcast via WebSocket
    this.callGateway.broadcastQueueUpdate(queueData);

    // Broadcast to display clients
    await this.displayGateway.broadcastQueueCancelled(queueData);

    return {
      success: true,
      message: `Antrian ${updatedQueue.queueNumber} telah dilewati`,
      data: updatedQueue,
    };
  }

  async recallQueue(queueId: string): Promise<TTSResponse> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    if (queue.status !== QueueStatus.CALLED) {
      throw new BadRequestException(
        'Hanya antrian yang sudah dipanggil yang bisa dipanggil ulang',
      );
    }

    // Generate text untuk TTS recall
    const ttsText = this.generateRecallTTSText(queue.queueNumber);

    // Broadcast via WebSocket
    this.callGateway.broadcastQueueRecall({
      queueId: queue.id,
      queueNumber: queue.queueNumber,
      status: QueueStatus.CALLED,
      customerName: queue.customerName,
      type: queue.type,
      ttsText,
    });

    // Response untuk TTS
    const response: TTSResponse = {
      success: true,
      message: `Nomor antrian ${queue.queueNumber} dipanggil ulang`,
      data: {
        queueNumber: queue.queueNumber,
        text: ttsText,
        timestamp: new Date().toISOString(),
      },
    };
    return response;
  }

  async getCurrentCalls() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const calledQueues = await this.prisma.queue.findMany({
      where: {
        status: { in: [QueueStatus.WAITING] },
        queueDate: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      orderBy: [{ calledAt: 'desc' }],
      include: {
        servedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return {
      success: true,
      data: calledQueues,
      total: calledQueues.length,
    };
  }

  private generateTTSText(queueNumber: string): string {
    const isReservation = queueNumber.startsWith('R');
    const type = isReservation ? 'R' : 'W';
    const number = queueNumber.substring(1);

    return `Nomor antrian ${type} ${number}. Silakan menuju ke counter untuk dilayani.`;
  }

  private generateRecallTTSText(queueNumber: string): string {
    const isReservation = queueNumber.startsWith('R');
    const type = isReservation ? 'R' : 'W';
    const number = queueNumber.substring(1);

    return `Panggilan ulang. Nomor antrian ${type} ${number}. Silakan segera menuju ke counter untuk dilayani.`;
  }
}
