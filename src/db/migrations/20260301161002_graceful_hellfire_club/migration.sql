ALTER TABLE IF EXISTS "bills" ALTER COLUMN "origin_body" SET DATA TYPE varchar(120) USING "origin_body"::varchar(120);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_chamber_sort_idx" ON "bills" ("chamber_id","sort_order","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chamber_roles_user_chamber_role_idx" ON "chamber_roles" ("user_id","chamber_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chamber_roles_chamber_user_idx" ON "chamber_roles" ("chamber_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chambers_name_idx" ON "chambers" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stage_options_active_sort_idx" ON "stage_options" ("is_active","sort_order","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "state_events_chamber_created_idx" ON "state_events" ("chamber_id","created_at");