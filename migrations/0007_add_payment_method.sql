
-- Add method column to payments table
ALTER TABLE "payments" ADD COLUMN "method" varchar NOT NULL DEFAULT 'cash';

-- Remove the default after adding the column
ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;
