---
description: 调试问题时的检查清单和常见陷阱
---

# 调试指南

## 🔑 API Key 相关问题

### 常见错误
- `Cannot convert argument to a ByteString because the character at index X has a value of XXXXX`
- 这意味着 **API Key 包含非 ASCII 字符**（如中文占位符）

### 排查步骤
1. **检查 `.env` 实际内容**（不是 `.env.example`）
   ```bash
   cat .env | grep API_KEY
   ```

2. **检查非 ASCII 字符**
   ```bash
   grep "API_KEY" .env | od -c | head -n 2
   # 正常应该只显示 ASCII 字符（字母、数字、符号）
   ```

3. **快速正则检查**
   ```bash
   grep -P '[^\x00-\x7F]' .env
   # 如果有输出，说明存在非 ASCII 字符
   ```

### 教训
- ⚠️ 不要假设配置正确，**必须检查实际的 `.env` 文件**
- ⚠️ 占位符如 `你的-api-key` 会导致编码错误
- ⚠️ 仔细分析错误信息中的**字符索引**和**Unicode 值**

---

## 🔧 常用调试命令

### 检查服务状态
```bash
lsof -i :6888 -i :6889 -i :6890 -i :8098 | grep LISTEN
```

### 检查进程
```bash
ps aux | grep -E "node|python|tsx"
```

### 查看日志
```bash
tail -50 docs/logs/server.log
tail -50 docs/logs/aktools.log
```

---

## 📋 调试清单

遇到问题时，按顺序检查：

1. [ ] **检查 `.env` 文件** - 配置是否正确？有无占位符？
2. [ ] **检查服务状态** - 端口是否在监听？
3. [ ] **查看日志** - 有无错误信息？
4. [ ] **检查编码问题** - 有无非 ASCII 字符？
5. [ ] **确认依赖** - `node_modules` 是否完整？

---

**创建时间**: 2026-01-10
**来源**: BUGFIX_GROK_API_KEY.log 经验总结
