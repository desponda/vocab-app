-- Safe migration to rename PARENT role to STUDENT
-- This uses a multi-step approach to safely rename the enum value

-- Step 1: Create new enum type with correct values
CREATE TYPE "UserRole_new" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- Step 2: Migrate existing data
-- Convert User.role column to use new enum
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'PARENT' THEN 'STUDENT'::"UserRole_new"
      WHEN 'TEACHER' THEN 'TEACHER'::"UserRole_new"
      WHEN 'ADMIN' THEN 'ADMIN'::"UserRole_new"
    END
  );

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"UserRole_new";

-- Step 3: Drop old enum and rename new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
