CREATE TABLE `game_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerName` varchar(64) NOT NULL DEFAULT 'Player',
	`course` varchar(32) NOT NULL,
	`difficulty` varchar(16) NOT NULL,
	`position` int NOT NULL,
	`raceTimeMs` bigint NOT NULL,
	`totalLaps` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_scores_id` PRIMARY KEY(`id`)
);
