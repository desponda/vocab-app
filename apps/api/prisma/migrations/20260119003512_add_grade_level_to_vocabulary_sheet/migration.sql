-- AlterTable
ALTER TABLE "Classroom" ALTER COLUMN "gradeLevel" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VocabularySheet" ADD COLUMN     "gradeLevel" INTEGER;
