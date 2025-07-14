import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DisplayService {
  constructor(private prisma: PrismaService) {}

  async getCurrentCalledQueues() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const calledQueues = await this.prisma.queue.findMany({
      where: {
        status: 'CALLED',
        queueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
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

  async getDashboardStats() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Active queues (waiting) based on queueDate
    const activeQueues = await this.prisma.queue.count({
      where: {
        status: QueueStatus.WAITING,
        queueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Active staff (logged in today and not logged out)
    const loggedInUsers = await this.prisma.user.findMany({
      where: {
        role: { in: ['STAFF'] },
        lastLoginAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      select: {
        lastLoginAt: true,
        lastLogoutAt: true,
      },
    });

    const activeStaff = loggedInUsers.filter(
      (u) =>
        u.lastLoginAt !== null &&
        (!u.lastLogoutAt || u.lastLoginAt > u.lastLogoutAt),
    ).length;

    // Top 3 staff by served queues today (based on queueDate)
    const topStaff = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        _count: {
          select: {
            servedQueues: {
              where: {
                status: QueueStatus.COMPLETED,
                queueDate: {
                  gte: todayStart,
                  lt: todayEnd,
                },
              },
            },
          },
        },
      },
      where: {
        servedQueues: {
          some: {
            status: QueueStatus.COMPLETED,
            queueDate: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
        },
      },
      orderBy: {
        servedQueues: {
          _count: 'desc',
        },
      },
      take: 3,
    });

    // Average service time per staff today
    const staffServiceStats = await this.prisma.queue.groupBy({
      by: ['servedById'],
      where: {
        status: QueueStatus.COMPLETED,
        serviceDuration: { not: null },
        servedById: { not: null },
        queueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _avg: {
        serviceDuration: true,
      },
      _count: {
        id: true,
      },
    });

    const validStaffIds = staffServiceStats
      .map((s) => s.servedById)
      .filter((id): id is string => id !== null);

    const staffDetails = await this.prisma.user.findMany({
      where: {
        id: { in: validStaffIds },
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    const staffServiceStatsWithDetails = staffServiceStats.map((stat) => ({
      staff: staffDetails.find((staff) => staff.id === stat.servedById),
      averageServiceTime: Math.round(stat._avg.serviceDuration || 0),
      totalServed: stat._count.id,
    }));

    return {
      success: true,
      data: {
        activeQueues,
        activeStaff,
        topStaff: topStaff.map((staff) => ({
          id: staff.id,
          name: staff.name,
          username: staff.username,
          totalServed: staff._count.servedQueues,
        })),
        staffServiceStats: staffServiceStatsWithDetails,
      },
    };
  }

  async getRecentCompletedQueues(limit: number) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const completedQueues = await this.prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
        queueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const waitingQueues = await this.prisma.queue.findMany({
      where: {
        status: QueueStatus.WAITING,
        queueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return waitingQueues.map((queue) => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      type: queue.type,
      customerName: queue.customerName,
      createdAt: queue.createdAt,
    }));
  }

  async getWaitingQueuesByDate(queueDate: Date, limit: number = 10) {
    // Set start and end of the day for the given date
    const startOfDay = new Date(queueDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(queueDate);
    endOfDay.setHours(23, 59, 59, 999);

    const waitingQueues = await this.prisma.queue.findMany({
      where: {
        status: 'WAITING',
        queueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
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
      queueDate: queue.queueDate,
      createdAt: queue.createdAt,
    }));
  }
}
