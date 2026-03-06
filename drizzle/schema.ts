import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Game scores table for race results
export const gameScores = mysqlTable("game_scores", {
  id: int("id").autoincrement().primaryKey(),
  playerName: varchar("playerName", { length: 64 }).notNull().default("Player"),
  course: varchar("course", { length: 32 }).notNull(), // grassland, snow, castle
  difficulty: varchar("difficulty", { length: 16 }).notNull(), // easy, normal, hard
  position: int("position").notNull(), // final race position (1-8)
  raceTimeMs: bigint("raceTimeMs", { mode: "number" }).notNull(), // race time in milliseconds
  totalLaps: int("totalLaps").notNull().default(3),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = typeof gameScores.$inferInsert;
