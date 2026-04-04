CREATE TABLE `saving_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL
);
