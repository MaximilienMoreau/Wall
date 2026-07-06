-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "adminToken" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "autoApprove" BOOLEAN NOT NULL DEFAULT true,
    "autoClusterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" DATETIME
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "questions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "question_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "synthesizedQuestion" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "votes_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "questions_eventId_idx" ON "questions"("eventId");

-- CreateIndex
CREATE INDEX "questions_groupId_idx" ON "questions"("groupId");

-- CreateIndex
CREATE INDEX "question_groups_eventId_idx" ON "question_groups"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_questionId_fingerprint_key" ON "votes"("questionId", "fingerprint");
