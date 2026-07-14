/*
  Warnings:

  - You are about to drop the column `timeSlot` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the `avilablitiys` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[availabilityId]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `availabilityId` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "avilablitiys" DROP CONSTRAINT "avilablitiys_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "avilablitiys" DROP CONSTRAINT "avilablitiys_technicianProfileId_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "timeSlot",
ADD COLUMN     "availabilityId" INTEGER NOT NULL,
ALTER COLUMN "bookingDate" SET DATA TYPE DATE,
ALTER COLUMN "address" DROP NOT NULL;

-- DropTable
DROP TABLE "avilablitiys";

-- CreateTable
CREATE TABLE "availabilities" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_availabilityId_key" ON "bookings"("availabilityId");

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "availabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
