import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

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

// 股票基本信息表
export const stocks = mysqlTable("stocks", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  market: varchar("market", { length: 2 }).notNull(), // SH/SZ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = typeof stocks.$inferInsert;

// 观察池表
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  stockCode: varchar("stockCode", { length: 6 }).notNull(),
  targetPrice: varchar("targetPrice", { length: 20 }),
  note: text("note"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  source: varchar("source", { length: 20 }).default("manual").notNull(), // manual/ocr/note
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

// K线数据缓存表
export const klines = mysqlTable("klines", {
  id: int("id").autoincrement().primaryKey(),
  stockCode: varchar("stockCode", { length: 6 }).notNull(),
  period: varchar("period", { length: 10 }).notNull(), // day/week/month
  tradeDate: varchar("tradeDate", { length: 10 }).notNull(), // YYYY-MM-DD
  open: varchar("open", { length: 20 }).notNull(),
  high: varchar("high", { length: 20 }).notNull(),
  low: varchar("low", { length: 20 }).notNull(),
  close: varchar("close", { length: 20 }).notNull(),
  volume: varchar("volume", { length: 30 }).notNull(),
  amount: varchar("amount", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Kline = typeof klines.$inferSelect;
export type InsertKline = typeof klines.$inferInsert;

// AI分析结果缓存表
export const analysisCache = mysqlTable("analysisCache", {
  id: int("id").autoincrement().primaryKey(),
  stockCode: varchar("stockCode", { length: 6 }).notNull().unique(),
  technicalScore: int("technicalScore"),
  technicalSignals: text("technicalSignals"), // JSON string
  sentimentScore: int("sentimentScore"),
  sentimentData: text("sentimentData"), // JSON string
  capitalScore: int("capitalScore"),
  capitalData: text("capitalData"), // JSON string
  summary: text("summary"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalysisCache = typeof analysisCache.$inferSelect;
export type InsertAnalysisCache = typeof analysisCache.$inferInsert;
