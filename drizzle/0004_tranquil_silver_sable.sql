CREATE TABLE "key_archives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"key_version" integer NOT NULL,
	"recovery_wrapped_mk" "bytea" NOT NULL,
	"recovery_mk_nonce" "bytea" NOT NULL,
	"recovery_salt" "bytea" NOT NULL,
	"recovery_auth_hash" text,
	"kdf_algo" text NOT NULL,
	"kdf_mem_kib" integer NOT NULL,
	"kdf_time" integer NOT NULL,
	"kdf_parallel" integer NOT NULL,
	"jumlah_entri" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purge_after" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "key_archives" ADD CONSTRAINT "key_archives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_arsip_user" ON "key_archives" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_arsip_purge" ON "key_archives" USING btree ("purge_after");