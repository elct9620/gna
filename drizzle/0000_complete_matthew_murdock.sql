CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`nickname` text,
	`unsubscribe_token` text NOT NULL,
	`created_at` text NOT NULL,
	`activated_at` text,
	`confirmation_token` text,
	`confirmation_expires_at` text,
	`magic_link_token` text,
	`magic_link_expires_at` text,
	`pending_email` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_email` ON `subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_unsubscribe_token` ON `subscribers` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_confirmation_token` ON `subscribers` (`confirmation_token`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_magic_link_token` ON `subscribers` (`magic_link_token`);