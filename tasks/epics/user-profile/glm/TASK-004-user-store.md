# TASK-004: 用户管理基础设施

## 负责 Agent: 🔵 GLM (力大飞砖)
> 后端基础设施代码量大，GLM 有套餐额度，适合大量代码生成。

## 背景 (Why)
DragonFly 需要支持多用户，每个用户有独立的 Profile 和聊天历史。这是整个用户画像系统的基础层。

## 目标 (Done Definition)
- [ ] `UserStore` 类实现：createUser, getUser, switchUser, listUsers, deleteUser
- [ ] 用户数据目录结构：`data/users/{userId}/`
- [ ] `active_user.json` 追踪当前活跃用户
- [ ] tRPC 路由：`profile.createUser`, `profile.switchUser`, `profile.getCurrentUser`, `profile.listUsers`
- [ ] 单元测试通过
- [ ] CI 全绿

## 范围
**In-scope:**
- UserStore 核心服务实现
- 用户目录创建和管理
- tRPC API 层
- 基础测试

**Out-of-scope:**
- 问诊流程（TASK-006）
- 前端组件（TASK-007）
- AI 集成（TASK-008）

## 契约 (Contract)

```typescript
// server/_core/userStore.ts

interface User {
  id: string;        // UUID
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

class UserStore {
  // 创建新用户，返回用户对象
  createUser(nickname: string): User;
  
  // 获取用户
  getUser(userId: string): User | null;
  
  // 获取所有用户
  listUsers(): User[];
  
  // 切换当前用户
  switchUser(userId: string): boolean;
  
  // 获取当前活跃用户
  getCurrentUser(): User | null;
  
  // 删除用户
  deleteUser(userId: string): boolean;
  
  // 获取用户的数据目录
  getUserDataPath(userId: string): string;
}

// 全局单例
function getUserStore(): UserStore;
```

```typescript
// server/routers/profile.ts

export const profileRouter = router({
  createUser: publicProcedure
    .input(z.object({ nickname: z.string().min(1).max(20) }))
    .mutation(({ input }) => { userId: string, user: User }),
    
  switchUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ input }) => { success: boolean }),
    
  getCurrentUser: publicProcedure
    .query(() => { user: User | null }),
    
  listUsers: publicProcedure
    .query(() => { users: User[] }),
});
```

## 实施计划

1. 创建 `server/_core/userStore.ts`
2. 创建 `server/routers/profile.ts`
3. 在 `server/routers/index.ts` 注册 profileRouter
4. 创建 `server/userStore.test.ts` 测试文件
5. 验证 CI 通过

## 验收清单

- [ ] 类型检查通过 (`pnpm check`)
- [ ] 测试通过 (`pnpm test`)
- [ ] 无行为回归
- [ ] 目录结构正确创建

## 文件清单

| 操作 | 文件路径 |
|------|----------|
| CREATE | `server/_core/userStore.ts` |
| CREATE | `server/routers/profile.ts` |
| MODIFY | `server/routers/index.ts` |
| CREATE | `server/userStore.test.ts` |

## 进度日志

| 时间 | Agent | 动作 | 产物 |
|------|-------|------|------|
| 2026-01-17 | Amp | 创建任务 | TASK-004-user-store.md |
