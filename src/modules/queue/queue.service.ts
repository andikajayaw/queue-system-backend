import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException, // ← TAMBAHKAN INI
  InternalServerErrorException, // ← TAMBAHKAN INI
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueType, QueueStatus } from '@prisma/client';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { DisplayGateway } from '../display/display/display.gateway';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private displayGateway: DisplayGateway,
  ) {}

  async createQueue(createQueueDto: CreateQueueDto) {
    const { type, customerName, phoneNumber } = createQueueDto;

    const now = new Date();
    const queueDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    if (type === QueueType.RESERVATION) {
      // Validasi input
      if (!type || !customerName) {
        throw new BadRequestException('Type dan Customer Name wajib diisi');
      }
    }
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // Generate queue number berdasarkan type
        const queueNumber = await this.generateQueueNumber(type);
        console.log(queueNumber);

        const queue = await this.prisma.queue.create({
          data: {
            queueNumber,
            type,
            customerName,
            phoneNumber,
            status: QueueStatus.WAITING,
            queueDate, // ← tambahkan ini
          },
        });

        const queueData = {
          id: queue.id,
          queueNumber: queue.queueNumber,
          type: queue.type,
          status: queue.status,
          customerName: queue.customerName,
          phoneNumber: queue.phoneNumber,
          createdAt: queue.createdAt,
        };

        await this.displayGateway.broadcastNewQueue(queueData);

        return {
          success: true,
          data: queue,
          message: `Nomor antrian ${queueNumber} berhasil dibuat`,
        };
      } catch (error) {
        console.error('Error creating queue:', error);

        // Handle specific database errors
        if (error.code === 'P2002') {
          // Duplicate queueNumber → retry
          attempt++;
          if (attempt >= MAX_RETRIES) {
            throw new ConflictException(
              'Gagal membuat antrian: nomor sudah dipakai, silakan coba lagi',
            );
          }
        } else {
          console.error('Error creating queue:', error);
          throw new InternalServerErrorException('Gagal membuat antrian');
        }
      }
    }
  }

  async findAll(status?: QueueStatus, type?: QueueType) {
    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;

    const queues = await this.prisma.queue.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      success: true,
      data: queues,
      total: queues.length,
    };
  }

  async findOne(id: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    return {
      success: true,
      data: queue,
    };
  }

  async findByQueueNumber(queueNumber: string) {
    // const queue = await this.prisma.queue.findUnique({
    //   where: { queueNumber },
    // });
    const queue = await this.prisma.queue.findFirst({
      where: {
        queueNumber,
        queueDate: {
          gte: startOfDay(new Date()),
          lt: endOfDay(new Date()),
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Nomor antrian tidak ditemukan');
    }

    return {
      success: true,
      data: queue,
    };
  }

  async updateQueue(id: string, updateQueueDto: UpdateQueueDto) {
    const existingQueue = await this.prisma.queue.findUnique({
      where: { id },
    });

    if (!existingQueue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    const updateData: any = { ...updateQueueDto };

    // Set timestamp berdasarkan status
    if (updateQueueDto.status === QueueStatus.CALLED) {
      updateData.calledAt = new Date();
    } else if (updateQueueDto.status === QueueStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedQueue = await this.prisma.queue.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: updatedQueue,
      message: 'Antrian berhasil diperbarui',
    };
  }

  async deleteQueue(id: string) {
    const existingQueue = await this.prisma.queue.findUnique({
      where: { id },
    });

    if (!existingQueue) {
      throw new NotFoundException('Antrian tidak ditemukan');
    }

    await this.prisma.queue.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Antrian berhasil dihapus',
    };
  }

  async getQueueStats() {
    const [total, waiting, called, serving, completed] = await Promise.all([
      this.prisma.queue.count(),
      this.prisma.queue.count({ where: { status: QueueStatus.WAITING } }),
      this.prisma.queue.count({ where: { status: QueueStatus.CALLED } }),
      this.prisma.queue.count({ where: { status: QueueStatus.SERVING } }),
      this.prisma.queue.count({ where: { status: QueueStatus.COMPLETED } }),
    ]);

    const [reservationCount, walkInCount] = await Promise.all([
      this.prisma.queue.count({ where: { type: QueueType.RESERVATION } }),
      this.prisma.queue.count({ where: { type: QueueType.WALK_IN } }),
    ]);

    return {
      success: true,
      data: {
        total,
        byStatus: {
          waiting,
          called,
          serving,
          completed,
        },
        byType: {
          reservation: reservationCount,
          walkIn: walkInCount,
        },
      },
    };
  }

  // dashboard analytics
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
              lte: todayEnd,
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

  async getTodayQueues() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queues = await this.prisma.queue.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      success: true,
      data: queues,
      total: queues.length,
    };
  }

  private async generateQueueNumber(type: QueueType): Promise<string> {
    const now = new Date();
    const queueDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const prefix = type === QueueType.RESERVATION ? 'R' : 'W';

    const existingQueues = await this.prisma.queue.findMany({
      where: {
        type,
        queueNumber: {
          startsWith: prefix,
        },
        queueDate,
      },
      select: {
        queueNumber: true,
      },
      orderBy: {
        queueNumber: 'asc',
      },
    });

    const existingNumbers = existingQueues.map((q) => {
      const numberStr = q.queueNumber.substring(1); // Remove R/W
      return parseInt(numberStr, 10);
    });

    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // Method untuk implementasi skema 2:1 (Reservasi:Walk-in)
  async getNextQueueByPriority() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waitingQueues = await this.prisma.queue.findMany({
      where: {
        status: QueueStatus.WAITING,
        queueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (waitingQueues.length === 0) {
      return null;
    }

    // Implementasi skema 2:1
    const reservationQueues = waitingQueues.filter(
      (q) => q.type === QueueType.RESERVATION,
    );
    const walkInQueues = waitingQueues.filter(
      (q) => q.type === QueueType.WALK_IN,
    );

    const calledToday = await this.prisma.queue.count({
      where: {
        status: {
          in: [QueueStatus.CALLED, QueueStatus.SERVING, QueueStatus.COMPLETED],
        },
        calledAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Logika 2:1 - setiap 3 panggilan, 2 reservasi dan 1 walk-in
    const cycle = calledToday % 3;

    if (cycle < 2 && reservationQueues.length > 0) {
      // Panggil reservasi
      return reservationQueues[0];
    } else if (walkInQueues.length > 0) {
      // Panggil walk-in
      return walkInQueues[0];
    } else if (reservationQueues.length > 0) {
      // Fallback ke reservasi jika tidak ada walk-in
      return reservationQueues[0];
    }

    return null;
  }
}
