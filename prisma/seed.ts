// import { PrismaClient, Role, QueueType, QueueStatus } from '@prisma/client';
// import * as bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 Starting database seeding...');

//   // 1. Create Users (Admin & Staff)
//   console.log('👥 Creating users...');

//   const adminUser = await prisma.user.create({
//     data: {
//       username: 'admin',
//       email: 'admin@hospital.com',
//       name: 'Administrator',
//       password: await bcrypt.hash('admin123', 12),
//       role: Role.ADMIN,
//       isActive: true,
//     },
//   });

//   const staffUsers = await Promise.all([
//     prisma.user.create({
//       data: {
//         username: 'staff1',
//         email: 'staff1@hospital.com',
//         name: 'Dr. Sarah Johnson',
//         password: await bcrypt.hash('staff123', 12),
//         role: Role.STAFF,
//         isActive: true,
//       },
//     }),
//     prisma.user.create({
//       data: {
//         username: 'staff2',
//         email: 'staff2@hospital.com',
//         name: 'Dr. Michael Chen',
//         password: await bcrypt.hash('staff123', 12),
//         role: Role.STAFF,
//         isActive: true,
//       },
//     }),
//     prisma.user.create({
//       data: {
//         username: 'staff3',
//         email: 'staff3@hospital.com',
//         name: 'Dr. Amanda Rodriguez',
//         password: await bcrypt.hash('staff123', 12),
//         role: Role.STAFF,
//         isActive: true,
//       },
//     }),
//     prisma.user.create({
//       data: {
//         username: 'staff4',
//         email: 'staff4@hospital.com',
//         name: 'Dr. James Wilson',
//         password: await bcrypt.hash('staff123', 12),
//         role: Role.STAFF,
//         isActive: true,
//       },
//     }),
//     prisma.user.create({
//       data: {
//         username: 'staff5',
//         email: 'staff5@hospital.com',
//         name: 'Dr. Lisa Park',
//         password: await bcrypt.hash('staff123', 12),
//         role: Role.STAFF,
//         isActive: false, // Inactive staff
//       },
//     }),
//   ]);

//   // Get only active staff for queue assignments
//   const activeStaff = staffUsers.filter(staff => staff.username !== 'staff5');

//   console.log(`✅ Created ${staffUsers.length + 1} users`);

//   // Helper function to get random active staff
//   const getRandomActiveStaff = () => {
//     return activeStaff[Math.floor(Math.random() * activeStaff.length)];
//   };

//   // 2. Create Historical Queue Data (Last 30 days)
//   console.log('📊 Creating historical queue data...');

//   const historicalQueues: any = [];
//   const today = new Date();

//   for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
//     const queueDate = new Date(today);
//     queueDate.setDate(today.getDate() - dayOffset);

//     // Normalize to date only (no time)
//     const normalizedQueueDate = new Date(
//       queueDate.getFullYear(),
//       queueDate.getMonth(),
//       queueDate.getDate(),
//     );

//     // Set working hours start time
//     const workingHoursStart = new Date(normalizedQueueDate);
//     workingHoursStart.setHours(8, 0, 0, 0);

//     // Random number of queues per day (20-50)
//     const dailyQueueCount = Math.floor(Math.random() * 31) + 20;

//     for (let i = 0; i < dailyQueueCount; i++) {
//       const queueType =
//         Math.random() > 0.6 ? QueueType.RESERVATION : QueueType.WALK_IN;
//       const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
//       const queueNumber = `${prefix}${(i + 1).toString().padStart(3, '0')}`;

//       // Random service times (5-45 minutes)
//       const serviceDuration = Math.floor(Math.random() * 41) + 5;

//       // Random staff assignment (weighted towards more active staff)
//       const staffWeights = [0.25, 0.25, 0.2, 0.15, 0.1, 0.05]; // staff1 and staff2 serve more
//       const randomValue = Math.random();
//       let selectedStaffIndex = 0;
//       let cumulativeWeight = 0;

//       for (let j = 0; j < staffWeights.length; j++) {
//         cumulativeWeight += staffWeights[j];
//         if (randomValue <= cumulativeWeight) {
//           selectedStaffIndex = j;
//           break;
//         }
//       }

//       const selectedStaff =
//         selectedStaffIndex < activeStaff.length
//           ? activeStaff[selectedStaffIndex]
//           : activeStaff[0];

//       // Create realistic timestamps
//       const createdAt = new Date(workingHoursStart);
//       createdAt.setMinutes(
//         createdAt.getMinutes() + i * 15 + Math.floor(Math.random() * 10),
//       );

//       const calledAt = new Date(createdAt);
//       calledAt.setMinutes(
//         calledAt.getMinutes() + Math.floor(Math.random() * 20) + 5,
//       );

//       const serviceStartedAt = new Date(calledAt);
//       serviceStartedAt.setMinutes(
//         serviceStartedAt.getMinutes() + Math.floor(Math.random() * 5) + 1,
//       );

//       const completedAt = new Date(serviceStartedAt);
//       completedAt.setMinutes(completedAt.getMinutes() + serviceDuration);

//       historicalQueues.push({
//         queueNumber,
//         queueDate: normalizedQueueDate,
//         type: queueType,
//         status: QueueStatus.COMPLETED,
//         customerName: `Customer ${queueType === QueueType.RESERVATION ? 'Reservasi' : 'Walk-in'} ${i + 1}`,
//         phoneNumber: `08${Math.floor(Math.random() * 1000000000)
//           .toString()
//           .padStart(9, '0')}`,
//         createdAt,
//         calledAt,
//         serviceStartedAt,
//         completedAt,
//         servedById: selectedStaff.id,
//         serviceDuration,
//       });
//     }
//   }

//   // Insert historical data in batches
//   const batchSize = 100;
//   for (let i = 0; i < historicalQueues.length; i += batchSize) {
//     const batch = historicalQueues.slice(i, i + batchSize);
//     await prisma.queue.createMany({
//       data: batch,
//     });
//   }

//   console.log(`✅ Created ${historicalQueues.length} historical queue records`);

//   // 3. Create Today's Queue Data
//   console.log("📅 Creating today's queue data...");

//   const todayQueues: any = [];
//   const todayDate = new Date();
//   todayDate.setHours(0, 0, 0, 0);

//   // Normalize date to ensure consistent format
//   const normalizedTodayDate = new Date(
//     todayDate.getFullYear(),
//     todayDate.getMonth(),
//     todayDate.getDate(),
//   );

//   // Today's completed queues (morning rush)
//   for (let i = 1; i <= 15; i++) {
//     const queueType =
//       Math.random() > 0.5 ? QueueType.RESERVATION : QueueType.WALK_IN;
//     const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
//     const queueNumber = `${prefix}${i.toString().padStart(3, '0')}`;

//     const createdAt = new Date(todayDate);
//     createdAt.setHours(8, 0, 0, 0);
//     createdAt.setMinutes(
//       createdAt.getMinutes() + i * 8 + Math.floor(Math.random() * 5),
//     );

//     const calledAt = new Date(createdAt);
//     calledAt.setMinutes(
//       calledAt.getMinutes() + Math.floor(Math.random() * 15) + 5,
//     );

//     const serviceStartedAt = new Date(calledAt);
//     serviceStartedAt.setMinutes(
//       serviceStartedAt.getMinutes() + Math.floor(Math.random() * 3) + 1,
//     );

//     const serviceDuration = Math.floor(Math.random() * 31) + 10;
//     const completedAt = new Date(serviceStartedAt);
//     completedAt.setMinutes(completedAt.getMinutes() + serviceDuration);

//     const selectedStaff = getRandomActiveStaff();

//     todayQueues.push({
//       queueNumber,
//       queueDate: normalizedTodayDate,
//       type: queueType,
//       status: QueueStatus.COMPLETED,
//       customerName: `Customer ${queueType === QueueType.RESERVATION ? 'Reservasi' : 'Walk-in'} ${i}`,
//       phoneNumber: `08${Math.floor(Math.random() * 1000000000)
//         .toString()
//         .padStart(9, '0')}`,
//       createdAt,
//       calledAt,
//       serviceStartedAt,
//       completedAt,
//       servedById: selectedStaff.id,
//       serviceDuration,
//     });
//   }

//   // Currently serving queues
//   for (let i = 16; i <= 18; i++) {
//     const queueType =
//       Math.random() > 0.5 ? QueueType.RESERVATION : QueueType.WALK_IN;
//     const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
//     const queueNumber = `${prefix}${i.toString().padStart(3, '0')}`;

//     const createdAt = new Date(todayDate);
//     createdAt.setHours(10, 0, 0, 0);
//     createdAt.setMinutes(createdAt.getMinutes() + i * 5);

//     const calledAt = new Date(createdAt);
//     calledAt.setMinutes(
//       calledAt.getMinutes() + Math.floor(Math.random() * 10) + 5,
//     );

//     const serviceStartedAt = new Date(calledAt);
//     serviceStartedAt.setMinutes(
//       serviceStartedAt.getMinutes() + Math.floor(Math.random() * 2) + 1,
//     );

//     const selectedStaff = getRandomActiveStaff();

//     todayQueues.push({
//       queueNumber,
//       queueDate: normalizedTodayDate,
//       type: queueType,
//       status: QueueStatus.SERVING,
//       customerName: `Customer ${queueType === QueueType.RESERVATION ? 'Reservasi' : 'Walk-in'} ${i}`,
//       phoneNumber: `08${Math.floor(Math.random() * 1000000000)
//         .toString()
//         .padStart(9, '0')}`,
//       createdAt,
//       calledAt,
//       serviceStartedAt,
//       servedById: selectedStaff.id,
//     });
//   }

//   // Called but not serving yet - NOW WITH STAFF ASSIGNMENT
//   for (let i = 19; i <= 21; i++) {
//     const queueType =
//       Math.random() > 0.5 ? QueueType.RESERVATION : QueueType.WALK_IN;
//     const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
//     const queueNumber = `${prefix}${i.toString().padStart(3, '0')}`;

//     const createdAt = new Date(todayDate);
//     createdAt.setHours(10, 30, 0, 0);
//     createdAt.setMinutes(createdAt.getMinutes() + i * 3);

//     const calledAt = new Date();
//     calledAt.setMinutes(
//       calledAt.getMinutes() - Math.floor(Math.random() * 5) - 1,
//     );

//     // IMPORTANT: Assign staff to CALLED queues
//     const selectedStaff = getRandomActiveStaff();

//     todayQueues.push({
//       queueNumber,
//       queueDate: normalizedTodayDate,
//       type: queueType,
//       status: QueueStatus.CALLED,
//       customerName: `Customer ${queueType === QueueType.RESERVATION ? 'Reservasi' : 'Walk-in'} ${i}`,
//       phoneNumber: `08${Math.floor(Math.random() * 1000000000)
//         .toString()
//         .padStart(9, '0')}`,
//       createdAt,
//       calledAt,
//       servedById: selectedStaff.id, // Staff assigned when called
//     });
//   }

//   // Waiting queues (current active queue) - No staff assignment yet
//   for (let i = 22; i <= 35; i++) {
//     const queueType =
//       Math.random() > 0.4 ? QueueType.RESERVATION : QueueType.WALK_IN;
//     const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
//     const queueNumber = `${prefix}${i.toString().padStart(3, '0')}`;

//     const createdAt = new Date(todayDate);
//     createdAt.setHours(11, 0, 0, 0);
//     createdAt.setMinutes(createdAt.getMinutes() + i * 2);

//     todayQueues.push({
//       queueNumber,
//       queueDate: normalizedTodayDate,
//       type: queueType,
//       status: QueueStatus.WAITING,
//       customerName: `Customer ${queueType === QueueType.RESERVATION ? 'Reservasi' : 'Walk-in'} ${i}`,
//       phoneNumber: `08${Math.floor(Math.random() * 1000000000)
//         .toString()
//         .padStart(9, '0')}`,
//       createdAt,
//       // No servedById for WAITING status - staff will be assigned when called
//     });
//   }

//   await prisma.queue.createMany({
//     data: todayQueues,
//   });

//   console.log(`✅ Created ${todayQueues.length} today's queue records`);

//   // 4. Display Statistics
//   console.log('\n📊 DATABASE STATISTICS:');
//   console.log('========================');

//   // Active queue count
//   const activeQueues = await prisma.queue.count({
//     where: {
//       queueDate: {
//         gte: normalizedTodayDate,
//       },
//       status: {
//         in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.SERVING],
//       },
//     },
//   });

//   console.log(`🟡 Active queues (waiting/called/serving): ${activeQueues}`);

//   // Queues by status
//   const queuesByStatus = await prisma.queue.groupBy({
//     by: ['status'],
//     where: {
//       queueDate: {
//         gte: normalizedTodayDate,
//       },
//     },
//     _count: {
//       status: true,
//     },
//   });

//   console.log('\n📊 TODAY\'S QUEUES BY STATUS:');
//   queuesByStatus.forEach((statusGroup) => {
//     console.log(`${statusGroup.status}: ${statusGroup._count.status}`);
//   });

//   // Verify CALLED queues have staff assigned
//   const calledQueuesWithStaff = await prisma.queue.count({
//     where: {
//       queueDate: {
//         gte: normalizedTodayDate,
//       },
//       status: QueueStatus.CALLED,
//       servedById: {
//         not: null,
//       },
//     },
//   });

//   const totalCalledQueues = await prisma.queue.count({
//     where: {
//       queueDate: {
//         gte: normalizedTodayDate,
//       },
//       status: QueueStatus.CALLED,
//     },
//   });

//   console.log(`\n✅ CALLED queues with staff assigned: ${calledQueuesWithStaff}/${totalCalledQueues}`);

//   // Active staff count
//   const activeStaffCount = await prisma.user.count({
//     where: {
//       role: Role.STAFF,
//       isActive: true,
//     },
//   });

//   console.log(`👨‍⚕️ Active staff: ${activeStaffCount}`);

//   // Top 3 staff by completed queues
//   const topStaff = await prisma.user.findMany({
//     where: {
//       role: Role.STAFF,
//     },
//     select: {
//       name: true,
//       _count: {
//         select: {
//           servedQueues: {
//             where: {
//               status: QueueStatus.COMPLETED,
//             },
//           },
//         },
//       },
//     },
//     orderBy: {
//       servedQueues: {
//         _count: 'desc',
//       },
//     },
//     take: 3,
//   });

//   console.log('\n🏆 TOP 3 STAFF BY COMPLETED QUEUES:');
//   topStaff.forEach((staff, index) => {
//     console.log(
//       `${index + 1}. ${staff.name}: ${staff._count.servedQueues} queues`,
//     );
//   });

//   // Average service duration by staff
//   const staffStats = await prisma.user.findMany({
//     where: {
//       role: Role.STAFF,
//       servedQueues: {
//         some: {
//           status: QueueStatus.COMPLETED,
//           serviceDuration: {
//             not: null,
//           },
//         },
//       },
//     },
//     select: {
//       name: true,
//       servedQueues: {
//         where: {
//           status: QueueStatus.COMPLETED,
//           serviceDuration: {
//             not: null,
//           },
//         },
//         select: {
//           serviceDuration: true,
//         },
//       },
//     },
//   });

//   console.log('\n⏱️ AVERAGE SERVICE TIME BY STAFF:');
//   staffStats.forEach((staff) => {
//     const avgDuration =
//       staff.servedQueues.reduce(
//         (sum, queue) => sum + (queue.serviceDuration || 0),
//         0,
//       ) / staff.servedQueues.length;
//     console.log(`${staff.name}: ${avgDuration.toFixed(1)} minutes`);
//   });

//   console.log('\n🎉 Seeding completed successfully!');
//   console.log('\n📋 LOGIN CREDENTIALS:');
//   console.log('Admin - Username: admin, Password: admin123');
//   console.log('Staff - Username: staff1-staff4, Password: staff123');
//   console.log('\n🔧 QUEUE ASSIGNMENT LOGIC:');
//   console.log('- WAITING: No staff assigned yet');
//   console.log('- CALLED: Staff automatically assigned');
//   console.log('- SERVING: Staff assigned and service started');
//   console.log('- COMPLETED: Staff assigned with service duration');
// }

// main()
//   .catch((e) => {
//     console.error('❌ Error during seeding:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

import { PrismaClient, Role, QueueType, QueueStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting today-only database seeding...');

  // 1. Create Users
  console.log('👥 Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@hospital.com',
      name: 'Administrator',
      password: await bcrypt.hash('admin123', 12),
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const staffUsers = await Promise.all([
    prisma.user.create({
      data: {
        username: 'staff1',
        email: 'staff1@hospital.com',
        name: 'Dr. Sarah Johnson',
        password: await bcrypt.hash('staff123', 12),
        role: Role.STAFF,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'staff2',
        email: 'staff2@hospital.com',
        name: 'Dr. Michael Chen',
        password: await bcrypt.hash('staff123', 12),
        role: Role.STAFF,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'staff3',
        email: 'staff3@hospital.com',
        name: 'Dr. Amanda Rodriguez',
        password: await bcrypt.hash('staff123', 12),
        role: Role.STAFF,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'staff4',
        email: 'staff4@hospital.com',
        name: 'Dr. James Wilson',
        password: await bcrypt.hash('staff123', 12),
        role: Role.STAFF,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${staffUsers.length + 1} users`);

  const getRandomStaff = () =>
    staffUsers[Math.floor(Math.random() * staffUsers.length)];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0); // Normalize

  const todayQueues: any[] = [];

  // Generate 30 queues for today (mix of statuses)
  for (let i = 1; i <= 30; i++) {
    const queueType =
      Math.random() > 0.5 ? QueueType.RESERVATION : QueueType.WALK_IN;
    const prefix = queueType === QueueType.RESERVATION ? 'R' : 'W';
    const queueNumber = `${prefix}${i.toString().padStart(3, '0')}`;

    const createdAt = new Date(todayDate);
    createdAt.setHours(8 + Math.floor(i / 4), (i * 5) % 60);

    const statusPool = [
      QueueStatus.WAITING,
      QueueStatus.CALLED,
      QueueStatus.SERVING,
      QueueStatus.COMPLETED,
    ];
    const status = statusPool[Math.floor(Math.random() * statusPool.length)];

    const selectedStaff =
      status !== QueueStatus.WAITING ? getRandomStaff() : null;

    let calledAt = new Date();
    let serviceStartedAt = new Date();
    let completedAt = new Date();
    let serviceDuration = 0;

    if (status !== QueueStatus.WAITING) {
      calledAt = new Date(createdAt);
      calledAt.setMinutes(calledAt.getMinutes() + 5);

      if (status === QueueStatus.SERVING || status === QueueStatus.COMPLETED) {
        serviceStartedAt = new Date(calledAt);
        serviceStartedAt.setMinutes(serviceStartedAt.getMinutes() + 2);
      }

      if (status === QueueStatus.COMPLETED) {
        serviceDuration = Math.floor(Math.random() * 31) + 10;
        completedAt = new Date(serviceStartedAt);
        completedAt.setMinutes(completedAt.getMinutes() + serviceDuration);
      }
    }

    todayQueues.push({
      queueNumber,
      queueDate: todayDate,
      type: queueType,
      status,
      customerName: `Customer ${prefix}${i}`,
      phoneNumber: `08${Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, '0')}`,
      createdAt,
      calledAt,
      serviceStartedAt,
      completedAt,
      servedById: selectedStaff?.id ?? undefined,
      serviceDuration,
    });
  }

  await prisma.queue.createMany({
    data: todayQueues,
  });

  console.log(`✅ Created ${todayQueues.length} queues for today`);

  console.log('\n🎉 Seeding today-only data completed successfully!');
  console.log('\n📋 LOGIN CREDENTIALS:');
  console.log('Admin - Username: admin, Password: admin123');
  console.log('Staff - Username: staff1-staff4, Password: staff123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
