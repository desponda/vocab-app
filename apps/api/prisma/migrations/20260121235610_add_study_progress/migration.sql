-- CreateTable
CREATE TABLE "StudyProgress" (
    "id" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" TIMESTAMP(3),
    "studyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,

    CONSTRAINT "StudyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyProgress_studentId_idx" ON "StudyProgress"("studentId");

-- CreateIndex
CREATE INDEX "StudyProgress_wordId_idx" ON "StudyProgress"("wordId");

-- CreateIndex
CREATE INDEX "StudyProgress_confidence_idx" ON "StudyProgress"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgress_studentId_wordId_key" ON "StudyProgress"("studentId", "wordId");

-- AddForeignKey
ALTER TABLE "StudyProgress" ADD CONSTRAINT "StudyProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgress" ADD CONSTRAINT "StudyProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
