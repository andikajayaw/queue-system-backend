/*
  Warnings:

  - A unique constraint covering the columns `[queueNumber,createdDate]` on the table `queues` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "queues_queueNumber_key";

-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "createdDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "queues_queueNumber_createdDate_key" ON "queues"("queueNumber", "createdDate");
