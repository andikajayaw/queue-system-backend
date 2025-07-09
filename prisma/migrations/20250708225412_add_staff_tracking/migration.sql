-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "servedById" TEXT,
ADD COLUMN     "serviceDuration" INTEGER,
ADD COLUMN     "serviceStartedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_servedById_fkey" FOREIGN KEY ("servedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
