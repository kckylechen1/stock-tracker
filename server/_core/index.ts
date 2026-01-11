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

  // 流式 AI 聊天端点 - 使用 SmartAgent 新架构
  app.post("/api/ai/stream", async (req, res) => {
    const { hybridStreamChat } = await import("./smartStreamChat");
    const { saveChatHistory } = await import("../local_db");

    // 设置 SSE 头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { messages, stockCode, stockContext, useSmartAgent = true, sessionId, thinkHard } = req.body;
    let fullContent = "";

    try {
      // 使用 hybridStreamChat，默认使用新架构
      for await (const chunk of hybridStreamChat({
        messages,
        stockCode,
        stockContext,
        useSmartAgent,
        sessionId,
        thinkHard,
      })) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);

      // 自动保存聊天历史
      try {
        const newHistory = [
          ...messages,
          { role: 'assistant', content: fullContent }
        ];
        // 异步保存，不阻塞响应结束
        saveChatHistory(newHistory, stockCode).catch(console.error);
      } catch (saveError) {
        console.error("Failed to auto-save chat history:", saveError);
      }

    } catch (error) {
      console.error("Stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    }

    res.end();
  });

  // tRPC API
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
