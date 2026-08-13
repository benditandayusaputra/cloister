ALTER TABLE "public_entries" ADD COLUMN "redaction_applied" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "public_entries" ADD COLUMN "exposure_score" smallint;