-- Company-wide settings such as dashboard maximum workers.
CREATE TABLE IF NOT EXISTS "company_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by" TEXT,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_settings_key_key" ON "company_settings"("key");

ALTER TABLE "company_settings"
  ADD CONSTRAINT "company_settings_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Soft-delete fields for tasks.
ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "permanentDeleteAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Task_isDeleted_permanentDeleteAt_idx" ON "Task"("isDeleted", "permanentDeleteAt");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_deletedBy_fkey"
  FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
