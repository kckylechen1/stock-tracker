/**
 * AKShare 智能工具
 *
 * 提供三层数据获取策略：
 * Layer 1: 预定义工具 (Eastmoney API) - 快速路径
 * Layer 2: AKShare 目录匹配 - 专业数据
 * Layer 3: 动态发现 - 后备方案
 */

import { callAKShare, checkAKToolsStatus, getAKToolsStatus } from "../akshare";
import {
  AKSHARE_CATALOG,
  matchAKShareEndpoint,
  getEndpointByName,
  generateCatalogMarkdown,
  type AKShareEndpoint,
} from "./akshare-catalog";

export interface AKShareToolResult {
  success: boolean;
  data?: any;
  error?: string;
  endpoint?: string;
  source: "akshare" | "eastmoney" | "cache";
  cached?: boolean;
}

const resultCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

/**
 * 添加到缓存，保持大小限制
 */
function addToCache(key: string, data: any): void {
  if (resultCache.size >= MAX_CACHE_SIZE) {
    // 删除最旧的条目
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of resultCache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      resultCache.delete(oldestKey);
    }
  }
  resultCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 检查 AKTools 服务状态
 */
export async function checkAKToolsServiceStatus(): Promise<{
  available: boolean;
  message: string;
  hint?: string;
}> {
  const isAvailable = await checkAKToolsStatus();
  const status = getAKToolsStatus();

  if (isAvailable) {
    return {
      available: true,
      message: "✅ AKTools 服务运行正常",
    };
  } else {
    return {
      available: false,
      message: `❌ AKTools 服务不可用: ${status.error || "未知错误"}`,
      hint: '请运行 "pnpm start:aktools" 启动服务',
    };
  }
}

/**
 * 智能查询 AKShare 数据
 * 根据用户查询自动匹配最佳接口
 */
export async function smartAKShareQuery(
  query: string,
  params?: Record<string, any>
): Promise<AKShareToolResult> {
  const matchedEndpoint = matchAKShareEndpoint(query);

  if (!matchedEndpoint) {
    return {
      success: false,
      error: `未找到匹配的 AKShare 接口。可用数据类型: ${getAvailableCategories()}`,
      source: "akshare",
    };
  }

  return executeAKShareEndpoint(matchedEndpoint.name, params);
}

/**
 * 执行指定的 AKShare 接口
 */
export async function executeAKShareEndpoint(
  endpointName: string,
  params?: Record<string, any>
): Promise<AKShareToolResult> {
  const endpoint = getEndpointByName(endpointName);

  if (!endpoint) {
    return {
      success: false,
      error: `未知的接口: ${endpointName}`,
      source: "akshare",
    };
  }

  const missingParams = endpoint.parameters
    .filter(p => p.required && (!params || !params[p.name]))
    .map(p => p.name);

  if (missingParams.length > 0) {
    return {
      success: false,
      error: `缺少必填参数: ${missingParams.join(", ")}`,
      endpoint: endpointName,
      source: "akshare",
    };
  }

  const cacheKey = `${endpointName}:${JSON.stringify(params || {})}`;
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AKShareTool] 使用缓存: ${endpointName}`);
    return {
      success: true,
      data: cached.data,
      endpoint: endpointName,
      source: "cache",
      cached: true,
    };
  }

  const isAvailable = await checkAKToolsStatus();
  if (!isAvailable) {
    return {
      success: false,
      error: 'AKTools 服务未运行。请执行 "pnpm start:aktools" 启动服务。',
      endpoint: endpointName,
      source: "akshare",
    };
  }

  try {
    console.log(`[AKShareTool] 调用: ${endpointName}`, params || {});
    const data = await callAKShare(endpointName, params || {});

    addToCache(cacheKey, data);

    return {
      success: true,
      data,
      endpoint: endpointName,
      source: "akshare",
    };
  } catch (error: any) {
    return {
      success: false,
      error: `调用 ${endpointName} 失败: ${error.message}`,
      endpoint: endpointName,
      source: "akshare",
    };
  }
}

/**
 * 获取接口详细信息
 */
export function getEndpointInfo(endpointName: string): AKShareEndpoint | null {
  return getEndpointByName(endpointName) || null;
}

/**
 * 获取可用的数据分类
 */
export function getAvailableCategories(): string {
  const categories = new Set<string>();
  for (const ep of AKSHARE_CATALOG) {
    categories.add(ep.category);
  }
  return Array.from(categories).join(", ");
}

/**
 * 搜索相关接口
 */
export function searchEndpoints(keyword: string): AKShareEndpoint[] {
  const keywordLower = keyword.toLowerCase();
  return AKSHARE_CATALOG.filter(
    ep =>
      ep.name.toLowerCase().includes(keywordLower) ||
      ep.description.toLowerCase().includes(keywordLower) ||
      ep.category.toLowerCase().includes(keywordLower) ||
      ep.triggers.some(t => t.toLowerCase().includes(keywordLower))
  );
}

/**
 * 为 LLM 生成接口目录摘要
 */
export function getEndpointCatalogForLLM(): string {
  return generateCatalogMarkdown();
}

/**
 * OpenAI 工具定义 - 用于 Agent 调用
 */
export const AKSHARE_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "check_aktools_status",
      description:
        "检查 AKTools 服务是否可用。在调用任何 AKShare 接口前应先检查状态。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "call_akshare",
      description: `调用 AKShare 接口获取金融数据。可用数据类型包括：龙虎榜、融资融券、北向资金、行业板块、概念板块、高管持股、研报、财务数据、宏观数据、涨停数据、基金数据等。

常用接口示例：
- stock_lhb_detail_em: 龙虎榜详情
- stock_margin_sse: 融资融券余额
- stock_hsgt_hold_stock_em: 北向资金持股
- stock_board_industry_name_em: 行业板块列表
- stock_board_concept_name_em: 概念板块列表
- stock_research_report_em: 个股研报
- macro_china_gdp: 中国GDP数据
- stock_zt_pool_em: 涨停股票池`,
      parameters: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "AKShare 接口名称，如 stock_lhb_detail_em",
          },
          params: {
            type: "object",
            description: "接口参数，根据接口要求传入",
            additionalProperties: true,
          },
        },
        required: ["endpoint"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_akshare_endpoint",
      description:
        "搜索可用的 AKShare 接口。当不确定应该使用哪个接口时，可以先搜索。",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "搜索关键词，如：龙虎榜、融资、北向资金、板块",
          },
        },
        required: ["keyword"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_akshare_endpoint_info",
      description:
        "获取指定 AKShare 接口的详细信息，包括参数说明和返回值说明。",
      parameters: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "AKShare 接口名称",
          },
        },
        required: ["endpoint"],
      },
    },
  },
];

/**
 * 执行 AKShare 工具调用
 */
export async function executeAKShareTool(
  toolName: string,
  args: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case "check_aktools_status": {
      const status = await checkAKToolsServiceStatus();
      return JSON.stringify(status, null, 2);
    }

    case "call_akshare": {
      const { endpoint, params } = args;
      if (!endpoint) {
        return JSON.stringify({ error: "缺少 endpoint 参数" });
      }
      const result = await executeAKShareEndpoint(endpoint, params);

      if (!result.success) {
        return JSON.stringify({ error: result.error });
      }

      if (Array.isArray(result.data)) {
        const preview = result.data.slice(0, 20);
        return JSON.stringify(
          {
            total: result.data.length,
            showing: preview.length,
            data: preview,
            note:
              result.data.length > 20
                ? `共 ${result.data.length} 条数据，仅显示前 20 条`
                : undefined,
          },
          null,
          2
        );
      }

      return JSON.stringify(result.data, null, 2);
    }

    case "search_akshare_endpoint": {
      const { keyword } = args;
      if (!keyword) {
        return JSON.stringify({ error: "缺少 keyword 参数" });
      }
      const endpoints = searchEndpoints(keyword);

      if (endpoints.length === 0) {
        return JSON.stringify({
          message: `未找到与 "${keyword}" 相关的接口`,
          available_categories: getAvailableCategories(),
        });
      }

      return JSON.stringify(
        endpoints.map(ep => ({
          name: ep.name,
          description: ep.description,
          category: ep.category,
          triggers: ep.triggers,
          parameters: ep.parameters.map(
            p => `${p.name} (${p.required ? "必填" : "可选"})`
          ),
        })),
        null,
        2
      );
    }

    case "get_akshare_endpoint_info": {
      const { endpoint } = args;
      if (!endpoint) {
        return JSON.stringify({ error: "缺少 endpoint 参数" });
      }
      const info = getEndpointInfo(endpoint);

      if (!info) {
        const similar = searchEndpoints(endpoint);
        return JSON.stringify({
          error: `未找到接口: ${endpoint}`,
          similar_endpoints: similar.slice(0, 5).map(e => e.name),
        });
      }

      return JSON.stringify(
        {
          name: info.name,
          description: info.description,
          category: info.category,
          parameters: info.parameters,
          returns: info.returns,
          triggers: info.triggers,
          example_call:
            info.parameters.length > 0
              ? `call_akshare("${info.name}", { ${info.parameters.map(p => `"${p.name}": "${p.example || "..."}"`).join(", ")} })`
              : `call_akshare("${info.name}")`,
        },
        null,
        2
      );
    }

    default:
      return JSON.stringify({ error: `未知工具: ${toolName}` });
  }
}
