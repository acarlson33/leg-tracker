CREATE TABLE "app_admins" (
	"user_id" varchar(255) PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" varchar(64) PRIMARY KEY,
	"chamber_id" varchar(64) NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(120) NOT NULL,
	"origin_body" varchar(20) NOT NULL,
	"stage" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_roles" (
	"id" varchar(64) PRIMARY KEY,
	"chamber_id" varchar(64) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_state" (
	"chamber_id" varchar(64) PRIMARY KEY,
	"state" varchar(64) NOT NULL,
	"active_bill_id" varchar(64),
	"updated_by_user_id" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chambers" (
	"id" varchar(64) PRIMARY KEY,
	"name" varchar(120) NOT NULL,
	"body" varchar(20) NOT NULL,
	"slug" varchar(120) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_options" (
	"id" varchar(64) PRIMARY KEY,
	"label" varchar(64) NOT NULL UNIQUE,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_events" (
	"id" varchar(64) PRIMARY KEY,
	"chamber_id" varchar(64) NOT NULL,
	"state" varchar(64) NOT NULL,
	"bill_id" varchar(64),
	"note" varchar(255),
	"updated_by_user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_chamber_id_chambers_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chamber_roles" ADD CONSTRAINT "chamber_roles_chamber_id_chambers_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chamber_state" ADD CONSTRAINT "chamber_state_chamber_id_chambers_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "state_events" ADD CONSTRAINT "state_events_chamber_id_chambers_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE CASCADE;