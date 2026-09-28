CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`repository` text NOT NULL,
	`baseline_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner` ON `projects` (`owner`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`label` text NOT NULL,
	`report` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_owner_created` ON `runs` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `runs_project` ON `runs` (`project_id`);