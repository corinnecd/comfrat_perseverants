CREATE TABLE IF NOT EXISTS `person_details` (
	`person` text PRIMARY KEY NOT NULL,
	`birthday_day` integer,
	`birthday_month` integer,
	`age_range` text,
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
