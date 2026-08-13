ALTER TABLE "profiles" ADD COLUMN "pengingat_aktif" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pengingat_jam" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pengingat_offset" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pengingat_terakhir" timestamp with time zone;