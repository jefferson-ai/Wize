ALTER TABLE `accounts` ADD `balance` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `initial_balance`;--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `current_balance`;--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `updated_at`;