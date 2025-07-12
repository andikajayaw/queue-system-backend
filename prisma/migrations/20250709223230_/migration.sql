/*
  Warnings:

  - You are about to drop the column `createdDate` on the `queues` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[queueNumber]` on the table `queues` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "queues_queueNumber_createdDate_key";

-- AlterTable
ALTER TABLE "queues" DROP COLUMN "createdDate";

-- CreateIndex
CREATE UNIQUE INDEX "queues_queueNumber_key" ON "queues"("queueNumber");
