import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // 硅基流动 AI API
  forgeApiUrl:
    process.env.BUILT_IN_FORGE_API_URL ?? "https://api.siliconflow.cn",
  forgeApiKey:
    process.env.BUILT_IN_FORGE_API_KEY ??
    "sk-ucmeiodrdhubymxanffmxjyrgyyvnfrffeerejhgpzokawhl",
  // xAI Grok API
  grokApiUrl: process.env.GROK_API_URL ?? "https://api.x.ai/v1",
  grokApiKey: process.env.XAI_API_KEY ?? process.env.GROK_API_KEY ?? "",
  grokModel: process.env.GROK_MODEL ?? "grok-4-1-fast-reasoning",
  // 智谱AI GLM API
  glmApiUrl: process.env.GLM_API_URL ?? "https://open.bigmodel.cn/api/paas/v4",
  glmApiKey: process.env.GLM_API_KEY ?? "",
  glmModel: process.env.GLM_MODEL ?? "glm-4.7",
  // 同花顺 iFinD API
  ifindRefreshToken:
    process.env.IFIND_REFRESH_TOKEN ??
    "eyJzaWduX3RpbWUiOiIyMDI1LTA2LTIzIDE4OjE0OjQ1In0=.eyJ1aWQiOiIzNzI3NDUyMTIiLCJ1c2VyIjp7ImFjY291bnQiOiJ0eXR6MDg1IiwiYXV0aFVzZXJJbmZvIjp7IkVleGNlbFBheWVycyI6IjE3NTEyMDE0MDIwMDAifSwiY29kZUNTSSI6W10sImNvZGVaekF1dGgiOltdLCJoYXNBSVByZWRpY3QiOmZhbHNlLCJoYXNBSVRhbGsiOmZhbHNlLCJoYXNDSUNDIjpmYWxzZSwiaGFzQ1NJIjpmYWxzZSwiaGFzRXZlbnREcml2ZSI6ZmFsc2UsImhhc0ZUU0UiOmZhbHNlLCJoYXNGYXN0IjpmYWxzZSwiaGFzRnVuZFZhbHVhdGlvbiI6ZmFsc2UsImhhc0hLIjp0cnVlLCJoYXNMTUUiOmZhbHNlLCJoYXNMZXZlbDIiOmZhbHNlLCJoYXNSZWFsQ01FIjpmYWxzZSwiaGFzVHJhbnNmZXIiOmZhbHNlLCJoYXNVUyI6ZmFsc2UsImhhc1VTQUluZGV4IjpmYWxzZSwiaGFzVVNERUJUIjpmYWxzZSwibWFya2V0QXV0aCI6eyJEQ0UiOmZhbHNlfSwibWF4T25MaW5lIjoxLCJub0Rpc2siOmZhbHNlLCJwcm9kdWN0VHlwZSI6IlNVUEVSQ09NTUFORFBST0RVQ1QiLCJyZWZyZXNoVG9rZW5FeHBpcmVkVGltZSI6IjIwMjYtMDYtMjkgMjA6NTA6MDIiLCJzZXNzc2lvbiI6ImMwZDBiYmY2OTQ3YmY2MDdkNmU3MTgwYTlkMzZlNTRhIiwic2lkSW5mbyI6e30sInRyYW5zQXV0aCI6ZmFsc2UsInVpZCI6IjM3Mjc0NTIxMiIsInVzZXJUeXBlIjoiRlJFRUlBTCIsIndpZmluZExpbWl0TWFwIjp7fX19.D31A827A6262A4A51CC2F7F9015808970994581C27E77B4276DE2025D284FAA1",
  ifindAccessToken:
    process.env.IFIND_ACCESS_TOKEN ??
    "97f7b9a3e9b7acbb74306d049524a626b755013e.signs_MzcyNzQ1MjEy",
  // Tavily API (网络搜索)
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  // E2B API (代码执行)
  e2bApiKey: process.env.E2B_API_KEY ?? "",
};
