/*
  Migration: Add name field to VocabularySheet

  Strategy:
  1. Add column as nullable
  2. Populate from originalName (strip file extension)
  3. Make column required
*/

-- Step 1: Add name column as nullable
ALTER TABLE "VocabularySheet" ADD COLUMN "name" TEXT;

-- Step 2: Populate existing records with originalName (strip extension)
UPDATE "VocabularySheet"
SET "name" = regexp_replace("originalName", '\.[^.]*$', '');

-- Step 3: Make name column required
ALTER TABLE "VocabularySheet" ALTER COLUMN "name" SET NOT NULL;
