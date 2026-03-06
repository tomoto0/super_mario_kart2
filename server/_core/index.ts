import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── REST API for Game (called from game.html plain JS) ───────────────────

  // POST /api/scores — save a race result
  app.post("/api/scores", async (req, res) => {
    try {
      const { insertGameScore } = await import("../db");
      const { playerName, course, difficulty, position, raceTimeMs, totalLaps } = req.body;
      if (!course || !difficulty || position === undefined || raceTimeMs === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      await insertGameScore({
        playerName: playerName || "Player",
        course,
        difficulty,
        position: Number(position),
        raceTimeMs: Number(raceTimeMs),
        totalLaps: totalLaps || 3,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[API] Failed to save score:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  // GET /api/scores — get top scores (optionally filtered by course/difficulty)
  app.get("/api/scores", async (req, res) => {
    try {
      const { getTopScores } = await import("../db");
      const course = req.query.course as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const scores = await getTopScores(course, difficulty, limit);
      res.json(scores);
    } catch (error) {
      console.error("[API] Failed to get scores:", error);
      res.status(500).json({ error: "Failed to get scores" });
    }
  });

  // GET /api/leaderboard — get top 10 for a course + difficulty
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { getLeaderboard } = await import("../db");
      const course = req.query.course as string;
      const difficulty = req.query.difficulty as string;
      if (!course || !difficulty) {
        res.status(400).json({ error: "course and difficulty are required" });
        return;
      }
      const scores = await getLeaderboard(course, difficulty, 10);
      res.json(scores);
    } catch (error) {
      console.error("[API] Failed to get leaderboard:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // POST /api/leaderboard/check — check if a race time qualifies for the leaderboard
  app.post("/api/leaderboard/check", async (req, res) => {
    try {
      const { checkLeaderboardRank } = await import("../db");
      const { course, difficulty, raceTimeMs } = req.body;
      if (!course || !difficulty || raceTimeMs === undefined) {
        res.status(400).json({ error: "course, difficulty, and raceTimeMs are required" });
        return;
      }
      const rank = await checkLeaderboardRank(course, difficulty, Number(raceTimeMs));
      res.json({ qualifies: rank > 0, rank });
    } catch (error) {
      console.error("[API] Failed to check rank:", error);
      res.status(500).json({ error: "Failed to check rank" });
    }
  });

  // POST /api/leaderboard/save — save a score with player name for the leaderboard
  app.post("/api/leaderboard/save", async (req, res) => {
    try {
      const { insertGameScore } = await import("../db");
      const { playerName, course, difficulty, position, raceTimeMs, totalLaps } = req.body;
      if (!playerName || !course || !difficulty || raceTimeMs === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      await insertGameScore({
        playerName: playerName.substring(0, 20),
        course,
        difficulty,
        position: Number(position) || 1,
        raceTimeMs: Number(raceTimeMs),
        totalLaps: totalLaps || 3,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[API] Failed to save leaderboard score:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  // ─── tRPC API ─────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
