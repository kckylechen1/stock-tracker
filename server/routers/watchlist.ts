import { publicProcedure, router } from "../_core/trpc";

export const watchlistRouter = router({
  // 获取观察池列表
  list: publicProcedure.query(async () => {
    const { getWatchlist } = await import("../db");
    return await getWatchlist();
  }),

  // 添加到观察池
  add: publicProcedure
    .input((val: unknown) => {
      if (typeof val === "object" && val !== null && "stockCode" in val) {
        return val as {
          stockCode: string;
          targetPrice?: string;
          note?: string;
          source?: string;
        };
      }
      throw new Error("Invalid input");
    })
    .mutation(async ({ input }) => {
      const { addToWatchlist, getWatchlist } = await import("../db");

      // 检查是否已存在
      const existingList = await getWatchlist();
      const alreadyExists = existingList.some(
        item => item.stockCode === input.stockCode
      );

      if (alreadyExists) {
        return { success: false, error: "该股票已在观察池中" };
      }

      await addToWatchlist(input);
      return { success: true };
    }),

  // 从观察池删除
  remove: publicProcedure
    .input((val: unknown) => {
      if (
        typeof val === "object" &&
        val !== null &&
        "id" in val &&
        typeof (val as any).id === "number"
      ) {
        return val as { id: number };
      }
      throw new Error("Invalid input");
    })
    .mutation(async ({ input }) => {
      const { removeFromWatchlist } = await import("../db");
      await removeFromWatchlist(input.id);
      return { success: true };
    }),

  // 更新观察池项
  update: publicProcedure
    .input((val: unknown) => {
      if (
        typeof val === "object" &&
        val !== null &&
        "id" in val &&
        typeof (val as any).id === "number"
      ) {
        return val as { id: number; targetPrice?: string; note?: string };
      }
      throw new Error("Invalid input");
    })
    .mutation(async ({ input }) => {
      const { updateWatchlistItem } = await import("../db");
      const { id, ...data } = input;
      await updateWatchlistItem(id, data);
      return { success: true };
    }),
});
