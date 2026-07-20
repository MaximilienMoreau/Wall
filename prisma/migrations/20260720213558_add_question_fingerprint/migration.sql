-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "fingerprint" TEXT;

-- CreateIndex
CREATE INDEX "questions_eventId_fingerprint_createdAt_idx" ON "questions"("eventId", "fingerprint", "createdAt");
