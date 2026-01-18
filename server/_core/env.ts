import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// ============================================================
// 环境变量配置
// 注意: 敏感信息必须通过 .env 文件配置，不允许硬编码
// ============================================================

export const ENV = {
  // 应用基础配置
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // 硅基流动 AI API (DeepSeek/Qwen)
  forgeApiUrl:
    process.env.BUILT_IN_FORGE_API_URL ?? "https://api.siliconflow.cn",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // xAI Grok API
  grokApiUrl: process.env.GROK_API_URL ?? "https://api.x.ai/v1",
  grokApiKey: process.env.XAI_API_KEY ?? process.env.GROK_API_KEY ?? "",
  grokModel: process.env.GROK_MODEL ?? "grok-4-1-fast-reasoning",

  // 智谱AI GLM API
  glmApiUrl: process.env.GLM_API_URL ?? "https://open.bigmodel.cn/api/paas/v4",
  glmApiKey: process.env.GLM_API_KEY ?? "",
  glmModel: process.env.GLM_MODEL ?? "glm-4.7",

  // 同花顺 iFinD API (可选)
  ifindRefreshToken: process.env.IFIND_REFRESH_TOKEN ?? "",
  ifindAccessToken: process.env.IFIND_ACCESS_TOKEN ?? "",

  // Tavily API (网络搜索，可选)
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",

  // E2B API (代码执行，可选)
  e2bApiKey: process.env.E2B_API_KEY ?? "",
};

// ============================================================
// 启动时环境变量校验
// ============================================================

interface EnvValidation {
  key: string;
  required: boolean;
  description: string;
}

const ENV_VALIDATIONS: EnvValidation[] = [
  { key: "DATABASE_URL", required: true, description: "数据库连接字符串" },
  { key: "JWT_SECRET", required: true, description: "JWT 签名密钥" },
];

// 可选但建议配置的 AI API (至少需要一个)
const AI_API_KEYS = ["GROK_API_KEY", "XAI_API_KEY", "GLM_API_KEY", "BUILT_IN_FORGE_API_KEY"];

export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必填项
  for (const { key, required, description } of ENV_VALIDATIONS) {
    if (required && !process.env[key]) {
      errors.push(`❌ 缺少必填环境变量: ${key} (${description})`);
    }
  }

  // 检查是否至少配置了一个 AI API
  const hasAnyAiKey = AI_API_KEYS.some((key) => !!process.env[key]);
  if (!hasAnyAiKey) {
    warnings.push(
      `⚠️  未配置任何 AI API 密钥，AI 功能将不可用。建议配置: ${AI_API_KEYS.join(" 或 ")}`
    );
  }

  // 输出警告
  if (warnings.length > 0) {
    console.warn("\n🔔 环境变量警告:");
    warnings.forEach((w) => console.warn(`   ${w}`));
  }

  // 如果有错误，抛出异常
  if (errors.length > 0) {
    console.error("\n🚨 环境变量校验失败:");
    errors.forEach((e) => console.error(`   ${e}`));
    console.error("\n💡 请复制 .env.example 为 .env 并填入正确的值\n");
    throw new Error(`环境变量校验失败: 缺少 ${errors.length} 个必填项`);
  }
}

// 开发模式下自动校验（生产环境应在启动脚本中显式调用）
if (process.env.NODE_ENV !== "test") {
  validateEnv();
}
