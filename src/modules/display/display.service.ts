import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DisplayService {
  constructor(private prisma: PrismaService) {}

  async getCurrentCalledQueues() {
    const calledQueues = await this.prisma.queue.findMany({
      where: {
        status: 'CALLED',
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
      orderBy: {
        calledAt: 'desc',
      },
    });

    return calledQueues.map((queue) => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      type: queue.type,
      status: queue.status,
      customerName: queue.customerName,
      calledAt: queue.calledAt,
      staff: queue.servedBy
        ? {
            id: queue.servedBy.id,
            name: queue.servedBy.name,
            username: queue.servedBy.username,
          }
        : null,
    }));
  }

  async getQueueStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      waitingCount,
      calledCount,
      servingCount,
      completedCount,
      reservationCount,
      walkInCount,
    ] = await Promise.all([
      this.prisma.queue.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          status: 'WAITING',
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          status: 'CALLED',
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          status: 'SERVING',
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          type: 'RESERVATION',
          createdAt: {
            gte: today,
          },
        },
      }),
      this.prisma.queue.count({
        where: {
          type: 'WALK_IN',
          createdAt: {
            gte: today,
          },
        },
      }),
    ]);

    return {
      totalToday,
      waitingCount,
      calledCount,
      servingCount,
      completedCount,
      reservationCount,
      walkInCount,
    };
  }

  async getRecentCompletedQueues(limit: number = 10) {
    const completedQueues = await this.prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
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
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });

    return completedQueues.map((queue) => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      type: queue.type,
      status: queue.status,
      customerName: queue.customerName,
      completedAt: queue.completedAt,
      serviceDuration: queue.serviceDuration,
      staff: queue.servedBy
        ? {
            id: queue.servedBy.id,
            name: queue.servedBy.name,
            username: queue.servedBy.username,
          }
        : null,
    }));
  }

  async getNextWaitingQueues(limit: number = 5) {
    const waitingQueues = await this.prisma.queue.findMany({
      where: {
        status: 'WAITING',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return waitingQueues.map((queue) => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      type: queue.type,
      customerName: queue.customerName,
      createdAt: queue.createdAt,
    }));
  }
}
