CREATE TABLE `attendance` (
	`person` text NOT NULL,
	`day` text NOT NULL,
	`time` text NOT NULL,
	`mode` text NOT NULL,
	PRIMARY KEY(`person`, `day`),
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `followups` (
	`person` text PRIMARY KEY NOT NULL,
	`note` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`first` text NOT NULL,
	`last` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`department` text NOT NULL,
	`status` text NOT NULL,
	`inviter` text DEFAULT '' NOT NULL,
	`token` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_token` ON `people` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_identity` ON `people` (`email`,`first`,`last`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
