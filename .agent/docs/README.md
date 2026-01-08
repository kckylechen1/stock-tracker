# 📚 技术文档目录

> ⚠️ **注意**：此文件夹位于 `.agent/` 下，不会上传到 Git 仓库。仅供本地开发参考。

## 文档结构

```
.agent/docs/
├── README.md                    # 本文件
├── product-summary.md           # 产品需求和解决方案文档
├── frontend-spec.md             # 前端开发完整规范
├── nlp-strategy-design.md       # NLP选股策略设计文档
└── nlp-strategy-dev-plan.md     # NLP策略模块开发计划
```

## 文档分类

| 类型 | 文件 | 说明 |
|------|------|------|
| **产品规划** | `product-summary.md` | 用户需求、产品形态、技术方案 |
| **前端规范** | `frontend-spec.md` | UI/UX设计、组件结构、API定义 |
| **功能设计** | `nlp-strategy-design.md` | NLP选股策略详细设计 |
| **开发计划** | `nlp-strategy-dev-plan.md` | 阶段划分、任务拆解、数据模型 |

## 文档管理最佳实践

### 1. 文档位置
- 技术/设计文档放在 `.agent/docs/`（不上传 Git）
- 用户可读的文档（如 README.md）放在项目根目录

### 2. 命名规范
- 使用 `kebab-case`（如 `api-reference.md`）
- 功能设计文档：`{feature}-design.md`
- 开发计划文档：`{feature}-dev-plan.md`

### 3. 文档结构
每个文档应包含：
- 版本号和日期
- 目标读者
- 核心内容
- 更新记录

### 4. 更新流程
1. 开发前：阅读相关文档
2. 开发中：发现问题及时更新
3. 开发后：更新状态和进度

---

**最后更新**: 2026-01-08
