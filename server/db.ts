import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

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
      values.role = "admin";
      updateSet.role = "admin";
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

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// 股票相关查询

export async function getStockByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { stocks } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(stocks)
    .where(eq(stocks.code, code))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertStock(stock: {
  code: string;
  name: string;
  market: string;
}) {
  const db = await getDb();
  if (!db) return;

  const { stocks } = await import("../drizzle/schema");
  await db
    .insert(stocks)
    .values(stock)
    .onDuplicateKeyUpdate({
      set: { name: stock.name, market: stock.market },
    });
}

export async function getAllStocks() {
  const db = await getDb();
  if (!db) return [];

  const { stocks } = await import("../drizzle/schema");
  return await db.select().from(stocks);
}

// 观察池相关查询

export async function getWatchlist() {
  const db = await getDb();
  if (!db) return [];

  const { watchlist } = await import("../drizzle/schema");
  return await db.select().from(watchlist);
}

export async function addToWatchlist(data: {
  stockCode: string;
  targetPrice?: string;
  note?: string;
  source?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const { watchlist } = await import("../drizzle/schema");

  // 构建插入数据，只包含非 undefined 的字段
  const insertData: any = {
    stockCode: data.stockCode,
  };

  if (data.targetPrice !== undefined) {
    insertData.targetPrice = data.targetPrice;
  }
  if (data.note !== undefined) {
    insertData.note = data.note;
  }
  if (data.source !== undefined) {
    insertData.source = data.source;
  }

  await db.insert(watchlist).values(insertData);
}

export async function removeFromWatchlist(id: number) {
  const db = await getDb();
  if (!db) return;

  const { watchlist } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.delete(watchlist).where(eq(watchlist.id, id));
}

export async function updateWatchlistItem(
  id: number,
  data: { targetPrice?: string; note?: string }
) {
  const db = await getDb();
  if (!db) return;

  const { watchlist } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(watchlist).set(data).where(eq(watchlist.id, id));
}

// K线数据查询

export async function getKlineData(
  stockCode: string,
  period: string,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];

  const { klines } = await import("../drizzle/schema");
  const { eq, and, desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(klines)
    .where(and(eq(klines.stockCode, stockCode), eq(klines.period, period)))
    .orderBy(desc(klines.tradeDate))
    .limit(limit);
}

export async function saveKlineData(data: any[]) {
  const db = await getDb();
  if (!db || data.length === 0) return;

  const { klines } = await import("../drizzle/schema");

  // 批量插入，如果存在则忽略
  for (const item of data) {
    try {
      await db.insert(klines).values(item);
    } catch (error) {
      // 忽略重复数据错误
    }
  }
}

// AI分析缓存查询

export async function getAnalysisCache(stockCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { analysisCache } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(analysisCache)
    .where(eq(analysisCache.stockCode, stockCode))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function saveAnalysisCache(stockCode: string, data: any) {
  const db = await getDb();
  if (!db) return;

  const { analysisCache } = await import("../drizzle/schema");
  await db
    .insert(analysisCache)
    .values({ stockCode, ...data })
    .onDuplicateKeyUpdate({
      set: data,
    });
}
