import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertGameScore, getTopScores, getRecentScores } from "./db";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Game score routes (public - no auth required for guest play)
  scores: router({
    save: publicProcedure
      .input(z.object({
        playerName: z.string().max(64).default("Player"),
        course: z.string(),
        difficulty: z.string(),
        position: z.number().int().min(1).max(8),
        raceTimeMs: z.number().int().min(0),
        totalLaps: z.number().int().default(3),
      }))
      .mutation(async ({ input }) => {
        await insertGameScore(input);
        return { success: true };
      }),
    top: publicProcedure
      .input(z.object({
        course: z.string().optional(),
        difficulty: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        return getTopScores(input?.course, input?.difficulty, input?.limit);
      }),
    recent: publicProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }).optional())
      .query(async ({ input }) => {
        return getRecentScores(input?.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
