import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
const isOffline = process.env.TEST_OFFLINE === "true";

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

const describeWatchlist = isOffline ? describe.skip : describe;

describeWatchlist("Watchlist", () => {
  it("should add stock to watchlist with all fields", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.watchlist.add({
      stockCode: "600519",
      targetPrice: "1500",
      note: "测试股票",
      source: "manual",
    });

    expect(result).toEqual({ success: true });
  });

  it("should add stock to watchlist with only required field", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.watchlist.add({
      stockCode: "000001",
    });

    expect(result).toEqual({ success: true });
  });

  it("should add stock to watchlist with partial optional fields", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.watchlist.add({
      stockCode: "002594",
      note: "比亚迪",
    });

    expect(result).toEqual({ success: true });
  });

  it("should list watchlist items", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.watchlist.list();

    expect(Array.isArray(list)).toBe(true);
  });
});
