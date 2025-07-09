// import { PrismaClient } from '@prisma/client';
// import { seedUsers } from './seeders/user.seeder';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🚀 Starting database seeding...\n');

//   try {
//     // Seed users
//     await seedUsers();

//     console.log('\n🎉 Database seeding completed successfully!');
//   } catch (error) {
//     console.error('❌ Error during seeding:', error);
//     throw error;
//   }
// }

// main()
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//     console.log('🔌 Database connection closed');
//   });
import { PrismaClient, Queue } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@antrian.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Create Staff Users
  const staff1 = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'staff1',
      email: 'staff1@antrian.com',
      name: 'Staff Satu',
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'staff2',
      email: 'staff2@antrian.com',
      name: 'Staff Dua',
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'staff3',
      email: 'staff3@antrian.com',
      name: 'Staff Tiga',
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('👤 Users created:', { admin, staff1, staff2, staff3 });

  // Create sample queues
  const queues: Queue[] = [];

  // Create Reservation queues
  for (let i = 1; i <= 10; i++) {
    const queue = await prisma.queue.create({
      data: {
        queueNumber: `R${i.toString().padStart(3, '0')}`,
        type: 'RESERVATION',
        status:
          i <= 3
            ? 'COMPLETED'
            : i <= 5
              ? 'SERVING'
              : i <= 7
                ? 'CALLED'
                : 'WAITING',
        customerName: `Customer Reservasi ${i}`,
        phoneNumber: `081234567${i.toString().padStart(3, '0')}`,
        servedById: i <= 5 ? (i % 2 === 0 ? staff1.id : staff2.id) : null,
        calledAt: i <= 7 ? new Date(Date.now() - 1000 * 60 * (10 - i)) : null,
        completedAt:
          i <= 3 ? new Date(Date.now() - 1000 * 60 * (15 - i)) : null,
        serviceStartedAt:
          i <= 5 ? new Date(Date.now() - 1000 * 60 * (8 - i)) : null,
        serviceDuration: i <= 3 ? Math.floor(Math.random() * 300) + 120 : null, // 2-7 menit
      },
    });
    queues.push(queue);
  }

  // Create Walk-in queues
  for (let i = 1; i <= 8; i++) {
    const queue = await prisma.queue.create({
      data: {
        queueNumber: `W${i.toString().padStart(3, '0')}`,
        type: 'WALK_IN',
        status:
          i <= 2
            ? 'COMPLETED'
            : i <= 4
              ? 'SERVING'
              : i <= 6
                ? 'CALLED'
                : 'WAITING',
        customerName: `Customer Walk-in ${i}`,
        phoneNumber: `082345678${i.toString().padStart(3, '0')}`,
        servedById: i <= 4 ? (i % 2 === 0 ? staff2.id : staff3.id) : null,
        calledAt: i <= 6 ? new Date(Date.now() - 1000 * 60 * (8 - i)) : null,
        completedAt:
          i <= 2 ? new Date(Date.now() - 1000 * 60 * (12 - i)) : null,
        serviceStartedAt:
          i <= 4 ? new Date(Date.now() - 1000 * 60 * (6 - i)) : null,
        serviceDuration: i <= 2 ? Math.floor(Math.random() * 400) + 180 : null, // 3-9 menit
      },
    });
    queues.push(queue);
  }

  console.log('🎫 Sample queues created:', queues.length);

  // Create additional historical data for dashboard statistics
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Historical completed queues for statistics
  for (let i = 0; i < 20; i++) {
    const isReservation = Math.random() > 0.4; // 60% reservation, 40% walk-in
    const staffIds = [staff1.id, staff2.id, staff3.id];
    const randomStaff = staffIds[Math.floor(Math.random() * staffIds.length)];

    const createdTime = new Date(
      yesterday.getTime() + Math.random() * 24 * 60 * 60 * 1000,
    );
    const serviceTime = Math.floor(Math.random() * 300) + 120; // 2-7 menit
    const completedTime = new Date(createdTime.getTime() + serviceTime * 1000);

    await prisma.queue.create({
      data: {
        queueNumber: `${isReservation ? 'R' : 'W'}${(100 + i).toString()}`,
        type: isReservation ? 'RESERVATION' : 'WALK_IN',
        status: 'COMPLETED',
        customerName: `Historical Customer ${i + 1}`,
        phoneNumber: `08123456${(7000 + i).toString()}`,
        servedById: randomStaff,
        createdAt: createdTime,
        calledAt: new Date(
          createdTime.getTime() + Math.random() * 10 * 60 * 1000,
        ),
        serviceStartedAt: new Date(
          createdTime.getTime() + Math.random() * 15 * 60 * 1000,
        ),
        completedAt: completedTime,
        serviceDuration: serviceTime,
      },
    });
  }

  console.log('📊 Historical data created for dashboard statistics');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
