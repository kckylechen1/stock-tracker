/**
 * Router 主入口
 * 聚合所有子路由
 */

import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";

// 子路由
import { authRouter } from "./auth";
import { stocksRouter } from "./stocks";
import { marketRouter } from "./market";
import { watchlistRouter } from "./watchlist";
import { analysisRouter } from "./analysis";
import { aiRouter } from "./ai";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  stocks: stocksRouter,
  market: marketRouter,
  watchlist: watchlistRouter,
  analysis: analysisRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
