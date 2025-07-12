/*
  Warnings:

  - A unique constraint covering the columns `[queueNumber,queueDate]` on the table `queues` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "queues_queueNumber_key";

-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "queueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "queues_queueNumber_queueDate_key" ON "queues"("queueNumber", "queueDate");
