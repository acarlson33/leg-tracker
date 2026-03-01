ALTER TABLE IF EXISTS "bills" ADD COLUMN IF NOT EXISTS "sort_order" integer;
--> statement-breakpoint
WITH ranked_bills AS (
	SELECT
		id,
		ROW_NUMBER() OVER (PARTITION BY chamber_id ORDER BY created_at, id) AS rn
	FROM bills
)
UPDATE bills
SET sort_order = ranked_bills.rn
FROM ranked_bills
WHERE bills.id = ranked_bills.id
	AND (bills.sort_order IS NULL OR bills.sort_order = 0);
--> statement-breakpoint
UPDATE "bills" SET "sort_order" = 0 WHERE "sort_order" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "bills" ALTER COLUMN "sort_order" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE IF EXISTS "bills" ALTER COLUMN "sort_order" SET NOT NULL;