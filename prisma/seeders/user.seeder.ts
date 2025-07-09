// prisma/seeders/user.seeder.ts (Simple Version)
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('🌱 Seeding users...');

  // Clear existing users
  await prisma.user.deleteMany({});
  console.log('✅ Cleared existing users');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin user
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@example.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.username);

  // Staff names
  const staffNames = [
    'John Doe',
    'Jane Smith',
    'Michael Johnson',
    'Sarah Wilson',
    'David Brown',
    'Lisa Davis',
    'Robert Miller',
    'Emily Taylor',
    'James Anderson',
    'Maria Garcia',
  ];

  // Create 10 Staff users
  let staffCount = 0;
  for (let i = 0; i < 10; i++) {
    const staffUser = await prisma.user.create({
      data: {
        username: `staff${i + 1}`,
        name: staffNames[i],
        email: `staff${i + 1}@example.com`,
        password: hashedPassword,
        role: Role.STAFF,
        isActive: true,
      },
    });

    staffCount++;
    console.log(`✅ Created staff user: ${staffUser.username} (${staffUser.name})`);
  }

  console.log(`\n🎉 Successfully seeded ${staffCount + 1} users:`);
  console.log(`   - 1 Admin user`);
  console.log(`   - ${staffCount} Staff users`);
  console.log(`\n📋 Login credentials:`);
  console.log(`   Admin: username=admin, password=password123`);
  console.log(`   Staff: username=staff1-staff10, password=password123`);
}

// Run seeder
if (require.main === module) {
  seedUsers()
    .catch((error) => {
      console.error('❌ Error seeding users:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedUsers };