CREATE TABLE IF NOT EXISTS `ai_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`analysis` text NOT NULL,
	`data_context` text,
	`model` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `charging_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`battery_start` integer,
	`battery_end` integer,
	`odometer` real,
	`cost_ntd` real,
	`location` text,
	`charge_type` text DEFAULT 'fast' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`raw_data_start` text,
	`raw_data_end` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tesla_id` integer NOT NULL,
	`display_name` text,
	`vin` text,
	`state` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vehicles_tesla_id_unique` ON `vehicles` (`tesla_id`);