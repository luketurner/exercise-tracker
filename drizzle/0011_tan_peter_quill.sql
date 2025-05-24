ALTER TABLE "exercises" ALTER COLUMN "updatedAt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "updatedAt" DROP NOT NULL;