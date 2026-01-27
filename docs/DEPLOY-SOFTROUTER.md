# 🚀 DragonFly 软路由部署指南

适用于 iStoreOS / OpenWrt 等支持 Docker 的软路由系统。

## 📋 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 内存 | 1GB | 2GB+ |
| 存储 | 5GB | 10GB+ |
| Docker | ✅ 已安装 | - |
| 架构 | x86_64 / arm64 | - |

## ⚡ 快速部署（3 步完成）

### 1. 上传项目到软路由

```bash
# 方式1：SSH 到软路由后 git clone
ssh root@<软路由IP>
mkdir -p /opt/dragonfly && cd /opt/dragonfly
git clone https://github.com/your-repo/dragonfly.git .

# 方式2：从本地 scp 上传（在本地执行）
scp -r /path/to/DragonFly/* root@<软路由IP>:/opt/dragonfly/
```

### 2. 配置环境变量

```bash
cd /opt/dragonfly
cp .env.example .env
vi .env
```

**必须配置的 API Key（至少配置一个 AI 服务）：**

```bash
# xAI Grok（推荐）
GROK_API_KEY=your-grok-api-key

# 或 SiliconFlow（国内可用）
BUILT_IN_FORGE_API_KEY=your-siliconflow-key

# 或 智谱 GLM
GLM_API_KEY=your-glm-key
```

### 3. 启动服务

```bash
cd /opt/dragonfly
docker-compose -f docker-compose.prod.yml up -d
```

等待约 2-5 分钟，所有服务启动完成后访问：
- **Web 界面**: `http://<软路由IP>:6888`

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 更新（拉取最新代码后）
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔐 安全建议

1. **修改数据库密码**：在 `.env` 中设置 `MYSQL_PASSWORD=你的强密码`
2. **配置防火墙**：只开放必要端口（6888）
3. **使用反向代理**：推荐用 nginx 添加 HTTPS

## ❓ 常见问题

### Q: 启动失败提示端口被占用？
```bash
# 检查端口占用
netstat -tlnp | grep 6888
# 修改 docker-compose.prod.yml 中的端口映射
```

### Q: 数据库连接失败？
```bash
# 等待 MySQL 启动完成
docker-compose -f docker-compose.prod.yml logs mysql
# 确认健康检查通过
docker ps | grep dragonfly-mysql
```

### Q: AKTools 服务不可用？
```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml logs aktools
# 测试 API
curl http://localhost:8098/api/public/stock_zh_a_spot_em
```

## 📊 资源占用参考

| 服务 | 内存占用 | 说明 |
|------|---------|------|
| MySQL | ~300MB | 数据库 |
| AKTools | ~200MB | 财经数据 API |
| DragonFly | ~150MB | 主应用 |
| **总计** | **~650MB** | 正常运行 |

---

_最后更新: 2026-01-18_
