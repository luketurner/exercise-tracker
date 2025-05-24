ALTER TABLE "exercises" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "updatedAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "lastUsedAt" timestamp;