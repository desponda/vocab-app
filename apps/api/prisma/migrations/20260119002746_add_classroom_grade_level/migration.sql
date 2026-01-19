/*
  Warnings:

  - Added the required column `gradeLevel` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Made `gradeLevel` on `Student` optional (now using Classroom.gradeLevel for test difficulty)

  Migration strategy:
  - Add gradeLevel to Classroom with default value of 6 (middle school)
  - Make Student.gradeLevel optional (backwards compatibility)
  - Existing classrooms will default to grade 6
*/

-- AlterTable: Add gradeLevel to Classroom with default value for existing records
ALTER TABLE "Classroom" ADD COLUMN "gradeLevel" INTEGER NOT NULL DEFAULT 6;

-- AlterTable: Make Student.gradeLevel optional
ALTER TABLE "Student" ALTER COLUMN "gradeLevel" DROP NOT NULL;
