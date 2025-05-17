ALTER TABLE "exercises" ADD COLUMN "createdAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "updatedAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "createdAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "updatedAt" timestamp NOT NULL;