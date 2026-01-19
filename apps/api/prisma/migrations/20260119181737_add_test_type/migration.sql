-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('VOCABULARY', 'SPELLING', 'GENERAL_KNOWLEDGE');

-- DropForeignKey
ALTER TABLE "TestQuestion" DROP CONSTRAINT "TestQuestion_wordId_fkey";

-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "sheetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TestQuestion" ALTER COLUMN "wordId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VocabularySheet" ADD COLUMN     "testType" "TestType" NOT NULL DEFAULT 'VOCABULARY';

-- CreateIndex
CREATE INDEX "VocabularySheet_testType_idx" ON "VocabularySheet"("testType");

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
