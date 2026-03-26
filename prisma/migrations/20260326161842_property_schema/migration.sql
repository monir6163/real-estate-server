/*
  Warnings:

  - Added the required column `thumbnail` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "thumbnail" TEXT NOT NULL;
