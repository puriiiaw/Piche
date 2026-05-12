-- CreateTable: actual hours tracking (planned vs actual)
CREATE TABLE "ActualHours" (
  "id"               TEXT NOT NULL,
  "projectId"        TEXT NOT NULL,
  "month"            TEXT NOT NULL,
  "totalHours"       DOUBLE PRECISION NOT NULL,
  "uploadedBy"       TEXT NOT NULL,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "originalFilename" TEXT NOT NULL,
  "rowCount"         INTEGER NOT NULL,
  CONSTRAINT "ActualHours_pkey" PRIMARY KEY ("id")
);

-- Foreign key to Project
ALTER TABLE "ActualHours"
  ADD CONSTRAINT "ActualHours_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: one record per project per month
CREATE UNIQUE INDEX "ActualHours_projectId_month_key"
  ON "ActualHours"("projectId", "month");

-- Index for project lookups
CREATE INDEX "ActualHours_projectId_idx"
  ON "ActualHours"("projectId");
