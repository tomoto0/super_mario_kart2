import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { gameScores, InsertGameScore, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Game Score Queries ───────────────────────────────────────────────────────

export async function insertGameScore(score: InsertGameScore) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert score: database not available");
    return null;
  }
  try {
    const result = await db.insert(gameScores).values(score);
    return result;
  } catch (error) {
    console.error("[Database] Failed to insert game score:", error);
    throw error;
  }
}

/**
 * Get top 10 leaderboard for a specific course + difficulty, ordered by best (lowest) race time.
 */
export async function getLeaderboard(course: string, difficulty: string, limit = 10) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get leaderboard: database not available");
    return [];
  }
  try {
    const results = await db
      .select({
        id: gameScores.id,
        playerName: gameScores.playerName,
        course: gameScores.course,
        difficulty: gameScores.difficulty,
        position: gameScores.position,
        raceTimeMs: gameScores.raceTimeMs,
        totalLaps: gameScores.totalLaps,
        createdAt: gameScores.createdAt,
      })
      .from(gameScores)
      .where(
        and(
          eq(gameScores.course, course),
          eq(gameScores.difficulty, difficulty)
        )
      )
      .orderBy(asc(gameScores.raceTimeMs))
      .limit(limit);
    return results;
  } catch (error) {
    console.error("[Database] Failed to get leaderboard:", error);
    return [];
  }
}

/**
 * Check if a given race time qualifies for the top 10 leaderboard.
 * Returns the rank (1-10) if it qualifies, or 0 if it doesn't.
 */
export async function checkLeaderboardRank(course: string, difficulty: string, raceTimeMs: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check rank: database not available");
    return 1; // If DB is unavailable, assume it qualifies (rank 1)
  }
  try {
    const topScores = await getLeaderboard(course, difficulty, 10);

    if (topScores.length < 10) {
      // Less than 10 entries, automatically qualifies
      let rank = 1;
      for (const score of topScores) {
        if (raceTimeMs > score.raceTimeMs) {
          rank++;
        }
      }
      return rank;
    }

    // Check if the new time is better than the worst time in top 10
    const worstTime = topScores[topScores.length - 1].raceTimeMs;
    if (raceTimeMs >= worstTime) {
      return 0; // Doesn't qualify
    }

    // Find the rank position
    let rank = 1;
    for (const score of topScores) {
      if (raceTimeMs > score.raceTimeMs) {
        rank++;
      }
    }
    return rank;
  } catch (error) {
    console.error("[Database] Failed to check leaderboard rank:", error);
    return 0;
  }
}

export async function getTopScores(course?: string, difficulty?: string, limit = 20) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get scores: database not available");
    return [];
  }
  try {
    let query = db.select().from(gameScores);
    const conditions = [];
    if (course) conditions.push(eq(gameScores.course, course));
    if (difficulty) conditions.push(eq(gameScores.difficulty, difficulty));
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return await query.orderBy(asc(gameScores.raceTimeMs)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get top scores:", error);
    return [];
  }
}

export async function getRecentScores(limit = 10) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get scores: database not available");
    return [];
  }
  try {
    return await db.select().from(gameScores).orderBy(desc(gameScores.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get recent scores:", error);
    return [];
  }
}
