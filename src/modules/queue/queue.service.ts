import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueType, QueueStatus } from '@prisma/client';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { DisplayGateway } from '../display/display/display.gateway';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private displayGateway: DisplayGateway,
  ) {}

  async createQueue(createQueueDto: CreateQueueDto) {
    const { type, customerName, phoneNumber } = createQueueDto;

    // Generate queue number berdasarkan type
    const queueNumber = await this.generateQueueNumber(type);

    const queue = await this.prisma.queue.create({
      data: {
        queueNumber,
        type,
        customerName,
        phoneNumber,
        status: QueueStatus.WAITING,
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
    const queue = await this.prisma.queue.findUnique({
      where: { queueNumber },
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active queues (waiting)
    const activeQueues = await this.prisma.queue.count({
      where: {
        status: QueueStatus.WAITING,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Active staff (logged in today and active)
    const activeStaff = await this.prisma.user.count({
      where: {
        isActive: true,
        role: { in: ['ADMIN', 'STAFF'] },
      },
    });

    // Top 3 staff by served queues today
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
                completedAt: {
                  gte: today,
                  lt: tomorrow,
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
            completedAt: {
              gte: today,
              lt: tomorrow,
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
        servedById: { not: null }, // Tambahkan filter untuk memastikan servedById tidak null
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _avg: {
        serviceDuration: true,
      },
      _count: {
        id: true,
      },
    });

    // Get staff details for service stats
    const validStaffIds = staffServiceStats
      .map((s) => s.servedById)
      .filter((id): id is string => id !== null); // Type guard untuk memastikan tidak ada null

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count existing queues for today by type
    const existingCount = await this.prisma.queue.count({
      where: {
        type,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const prefix = type === QueueType.RESERVATION ? 'R' : 'W';
    const number = (existingCount + 1).toString().padStart(3, '0');

    return `${prefix}${number}`;
  }

  // Method untuk implementasi skema 2:1 (Reservasi:Walk-in)
  async getNextQueueByPriority() {
    const waitingQueues = await this.prisma.queue.findMany({
      where: { status: QueueStatus.WAITING },
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

    // Hitung berapa banyak yang sudah dipanggil hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
