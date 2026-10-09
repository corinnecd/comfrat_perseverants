CREATE TABLE `checkin_sessions` (
	`meeting_day` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`starts_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkin_sessions_token_unique` ON `checkin_sessions` (`token`);