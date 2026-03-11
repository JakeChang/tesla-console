CREATE TABLE `cron_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`last_state` text,
	`last_poll_at` integer,
	`last_check_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cron_state_vehicle_id_unique` ON `cron_state` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `vehicle_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer,
	`latitude` real,
	`longitude` real,
	`battery_level` integer,
	`odometer` real,
	`speed` real,
	`heading` integer,
	`state` text,
	`shift_state` text,
	`raw_data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
