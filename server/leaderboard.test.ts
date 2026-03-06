import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock database module ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertGameScore: vi.fn().mockResolvedValue({ insertId: 1 }),
  getTopScores: vi.fn().mockResolvedValue([
    {
      id: 1,
      playerName: "Mario",
      course: "grassland",
      difficulty: "normal",
      position: 1,
      raceTimeMs: 120000,
      totalLaps: 3,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: 2,
      playerName: "Luigi",
      course: "grassland",
      difficulty: "normal",
      position: 2,
      raceTimeMs: 125000,
      totalLaps: 3,
      createdAt: new Date("2026-01-01T00:01:00Z"),
    },
  ]),
  getRecentScores: vi.fn().mockResolvedValue([
    {
      id: 3,
      playerName: "Peach",
      course: "snow",
      difficulty: "easy",
      position: 1,
      raceTimeMs: 130000,
      totalLaps: 3,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  ]),
  getLeaderboard: vi.fn().mockResolvedValue([
    {
      id: 1,
      playerName: "Mario",
      course: "grassland",
      difficulty: "normal",
      position: 1,
      raceTimeMs: 120000,
      totalLaps: 3,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ]),
  checkLeaderboardRank: vi.fn().mockResolvedValue(1),
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helper: create a minimal tRPC context ────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── scores.save ─────────────────────────────────────────────────────────────
describe("scores.save", () => {
  it("saves a valid race score and returns success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.save({
      playerName: "Mario",
      course: "grassland",
      difficulty: "normal",
      position: 1,
      raceTimeMs: 120000,
      totalLaps: 3,
    });

    expect(result).toEqual({ success: true });
  });

  it("saves a score with default playerName when omitted", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.save({
      course: "snow",
      difficulty: "easy",
      position: 2,
      raceTimeMs: 150000,
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects position outside 1-8 range", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.save({
        course: "grassland",
        difficulty: "normal",
        position: 9, // invalid
        raceTimeMs: 120000,
      })
    ).rejects.toThrow();
  });

  it("rejects negative raceTimeMs", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.save({
        course: "grassland",
        difficulty: "normal",
        position: 1,
        raceTimeMs: -1, // invalid
      })
    ).rejects.toThrow();
  });
});

// ─── scores.top ──────────────────────────────────────────────────────────────
describe("scores.top", () => {
  it("returns top scores without filters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.top();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      playerName: "Mario",
      course: "grassland",
      difficulty: "normal",
    });
  });

  it("returns top scores filtered by course and difficulty", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.top({
      course: "grassland",
      difficulty: "normal",
      limit: 5,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects limit greater than 100", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.top({ limit: 101 })
    ).rejects.toThrow();
  });
});

// ─── scores.recent ───────────────────────────────────────────────────────────
describe("scores.recent", () => {
  it("returns recent scores with default limit", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.recent();

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({
      playerName: "Peach",
      course: "snow",
    });
  });

  it("returns recent scores with custom limit", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.recent({ limit: 5 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects limit greater than 50", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.recent({ limit: 51 })
    ).rejects.toThrow();
  });
});

// ─── auth.logout ─────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
