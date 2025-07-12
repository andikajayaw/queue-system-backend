# Queue System Backend - Setup Guide

## 📋 Deskripsi Proyek

Sistem antrian berbasis NestJS dengan fitur real-time menggunakan WebSocket, autentikasi JWT, dan manajemen database PostgreSQL dengan Prisma ORM.

## 🔧 Persyaratan Sistem

- **Node.js**: v18.0.0 atau lebih baru
- **npm**: v8.0.0 atau lebih baru
- **PostgreSQL**: v13.0 atau lebih baru
- **Git**: untuk version control

## 📥 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd queue-system-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

#### Buat Database PostgreSQL

```sql
-- Login ke PostgreSQL
psql -U postgres

-- Buat database baru
CREATE DATABASE queue_system;

-- Keluar dari psql
\q
```

#### Konfigurasi Environment

Buat file `.env` di root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/queue_system"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# App Configuration
NODE_ENV=development
PORT=3000

# Optional: Prisma Studio Port
PRISMA_STUDIO_PORT=5555
```

**Catatan**: Ganti `username`, `password`, dan `your-super-secret-jwt-key-here` dengan nilai yang sesuai.

### 4. Setup Prisma

#### Generate Prisma Client

```bash
npm run db:generate
```

#### Push Schema ke Database

```bash
npm run db:push
```

#### Seed Database dengan Data Sample

```bash
npm run db:seed
```

Seeder akan membuat:

- 1 Admin user
- 5 Staff users (4 aktif, 1 non-aktif)
- Data historis antrian 30 hari terakhir
- Data antrian hari ini dengan berbagai status

## 🚀 Menjalankan Aplikasi

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
# Build aplikasi
npm run build

# Jalankan production
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## 🔑 Akun Default

Setelah menjalankan seeder, gunakan akun berikut untuk login:

### Admin Account

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@hospital.com`

### Staff Accounts

- **Username**: `staff1` - `staff4`
- **Password**: `staff123`
- **Email**: `staff1@hospital.com` - `staff4@hospital.com`

## 📊 Manajemen Database

### Melihat Data (Prisma Studio)

```bash
npm run db:studio
```

Akan membuka browser di `http://localhost:5555`

### Database Migration

```bash
# Membuat migration baru
npm run db:migrate

# Reset database (HATI-HATI: akan menghapus semua data)
npx prisma migrate reset
```

### Re-seed Database

```bash
npm run db:seed
```

## 🔧 Scripts yang Tersedia

| Script                | Deskripsi                          |
| --------------------- | ---------------------------------- |
| `npm run start`       | Menjalankan aplikasi               |
| `npm run start:dev`   | Development mode dengan hot reload |
| `npm run start:debug` | Debug mode                         |
| `npm run start:prod`  | Production mode                    |
| `npm run build`       | Build aplikasi untuk production    |
| `npm run db:generate` | Generate Prisma Client             |
| `npm run db:push`     | Push schema ke database            |
| `npm run db:migrate`  | Jalankan database migration        |
| `npm run db:studio`   | Buka Prisma Studio                 |
| `npm run db:seed`     | Seed database dengan data sample   |
| `npm run lint`        | Lint dan fix kode                  |
| `npm run format`      | Format kode dengan Prettier        |

## 📚 Fitur Utama

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin/Staff)
- Login/logout tracking

### Queue Management

- Dua jenis antrian: Reservation dan Walk-in
- Status antrian: WAITING, CALLED, SERVING, COMPLETED, CANCELLED
- Auto-assignment staff ketika antrian dipanggil

### Real-time Updates

- WebSocket untuk update real-time
- Notifikasi status antrian
- Dashboard live monitoring

### Reporting & Analytics

- Statistik harian, mingguan, bulanan
- Performance tracking per staff
- Service duration analytics

## 🌐 API Endpoints

### Authentication

- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/profile` - Get user profile

### Queue Management

- `GET /queues` - Get all queues
- `POST /queues` - Create new queue
- `PUT /queues/:id` - Update queue
- `DELETE /queues/:id` - Delete queue

### User Management (Admin only)

- `GET /users` - Get all users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Analytics

- `GET /analytics/dashboard` - Dashboard statistics
- `GET /analytics/staff-performance` - Staff performance
- `GET /analytics/queue-trends` - Queue trends

## 🔧 Troubleshooting

### Database Connection Error

```bash
# Pastikan PostgreSQL berjalan
sudo systemctl start postgresql

# Atau untuk macOS
brew services start postgresql
```

### Prisma Generate Error

```bash
# Hapus dan regenerate
rm -rf node_modules/.prisma
npm run db:generate
```

### Port Already in Use

```bash
# Ubah port di file .env
PORT=3001
```

### Reset Database Completely

```bash
npx prisma migrate reset
npm run db:seed
```

## 📁 Struktur Proyek

```
queue-system-backend/
├── src/
│   ├── auth/          # Authentication module
│   ├── queues/        # Queue management
│   ├── users/         # User management
│   ├── analytics/     # Analytics & reporting
│   ├── common/        # Shared utilities
│   └── main.ts        # Application entry point
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── seed.ts        # Database seeder
├── .env               # Environment variables
├── package.json       # Dependencies
└── README.md         # This file
```

## 🔒 Keamanan

- Password di-hash menggunakan bcrypt (salt rounds: 12)
- JWT tokens dengan expiration time
- Role-based access control
- Input validation dengan class-validator
- CORS configuration

## 🚀 Deployment

### Environment Variables untuk Production

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-very-secure-secret"
PORT=3000
```

### Build & Deploy

```bash
# Build aplikasi
npm run build

# Jalankan migration di production
npx prisma migrate deploy

# Start production server
npm run start:prod
```

## 📞 Support

Jika mengalami masalah:

1. Periksa log error di console
2. Pastikan semua environment variables sudah diset
3. Verifikasi koneksi database
4. Cek apakah semua dependencies sudah terinstall

---

**Selamat menggunakan Queue System Backend!** 🎉
