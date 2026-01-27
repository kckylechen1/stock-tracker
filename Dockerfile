# ============================================================
# DragonFly Stock Tracker - Production Dockerfile
# 多阶段构建，优化镜像大小
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 6888

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=6888

# 启动应用
CMD ["node", "dist/index.js"]
