/**
 * AKShare 接口目录
 * 
 * 包含精选的 AKShare 接口定义，用于 LLM 智能选择和调用
 * 
 * 数据源优先级：
 * 1. Eastmoney API - 实时行情、K线、资金流向（主要数据源）
 * 2. AKShare - 龙虎榜、融资融券、财务数据等专业数据
 * 3. iFind - 未来专业数据源（付费）
 */

export interface AKShareEndpoint {
    name: string;
    description: string;
    category: string;
    parameters: {
        name: string;
        type: 'string' | 'number' | 'date';
        required: boolean;
        description: string;
        example?: string;
    }[];
    returns: string;
    triggers: string[];
    priority: number;
}

export const AKSHARE_CATALOG: AKShareEndpoint[] = [
    // ==================== 龙虎榜 ====================
    {
        name: 'stock_lhb_detail_em',
        description: '龙虎榜详情数据，包含上榜股票、买卖金额、营业部信息',
        category: '龙虎榜',
        parameters: [],
        returns: '股票代码、名称、上榜原因、买入金额、卖出金额、净买入、营业部详情',
        triggers: ['龙虎榜', '游资', '营业部', '席位', '机构买入'],
        priority: 1.5,
    },
    {
        name: 'stock_lhb_ggtj_dtl_em',
        description: '龙虎榜每日个股统计明细',
        category: '龙虎榜',
        parameters: [
            { name: 'start_date', type: 'date', required: true, description: '开始日期', example: '20240101' },
            { name: 'end_date', type: 'date', required: true, description: '结束日期', example: '20240131' },
        ],
        returns: '股票代码、名称、上榜次数、买入金额、卖出金额',
        triggers: ['龙虎榜统计', '上榜次数', '龙虎榜历史'],
        priority: 1.2,
    },

    // ==================== 融资融券 ====================
    {
        name: 'stock_margin_sse',
        description: '上海证券交易所融资融券每日余额数据',
        category: '融资融券',
        parameters: [
            { name: 'start_date', type: 'date', required: true, description: '开始日期', example: '20240101' },
            { name: 'end_date', type: 'date', required: true, description: '结束日期', example: '20240131' },
        ],
        returns: '日期、融资余额、融资买入额、融券余额、融券卖出量',
        triggers: ['融资融券', '两融', '融资余额', '融券余额'],
        priority: 1.3,
    },
    {
        name: 'stock_margin_detail_sse',
        description: '上海证券交易所融资融券个股明细',
        category: '融资融券',
        parameters: [
            { name: 'date', type: 'date', required: true, description: '日期', example: '20240115' },
        ],
        returns: '股票代码、名称、融资余额、融资买入额、融券余量',
        triggers: ['个股融资', '融资明细', '融资买入'],
        priority: 1.1,
    },

    // ==================== 北向资金 / 沪深港通 ====================
    {
        name: 'stock_hsgt_hold_stock_em',
        description: '沪深港通持股个股排行',
        category: '北向资金',
        parameters: [
            { name: 'market', type: 'string', required: true, description: '市场类型', example: '北向' },
            { name: 'indicator', type: 'string', required: true, description: '统计周期', example: '今日排行' },
        ],
        returns: '股票代码、名称、持股数量、持股市值、占流通股比例、持股变化',
        triggers: ['北向资金', '沪深港通', '外资持股', '北向持股'],
        priority: 1.4,
    },
    {
        name: 'stock_hsgt_north_net_flow_in_em',
        description: '北向资金净流入历史数据',
        category: '北向资金',
        parameters: [],
        returns: '日期、当日净流入、当日余额、历史累计净流入',
        triggers: ['北向净流入', '外资流入', '北向资金历史'],
        priority: 1.2,
    },

    // ==================== 行业板块 ====================
    {
        name: 'stock_board_industry_name_em',
        description: '行业板块列表和实时行情',
        category: '板块',
        parameters: [],
        returns: '板块代码、板块名称、涨跌幅、成交额、换手率、领涨股',
        triggers: ['行业板块', '板块行情', '行业涨跌'],
        priority: 1.3,
    },
    {
        name: 'stock_board_industry_cons_em',
        description: '行业板块成分股列表',
        category: '板块',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '板块名称', example: '半导体' },
        ],
        returns: '股票代码、名称、现价、涨跌幅、成交额',
        triggers: ['板块成分股', '行业成分', '板块个股'],
        priority: 1.2,
    },
    {
        name: 'stock_board_concept_name_em',
        description: '概念板块列表和实时行情',
        category: '板块',
        parameters: [],
        returns: '板块代码、板块名称、涨跌幅、成交额、领涨股',
        triggers: ['概念板块', '题材板块', '概念行情', '热门概念'],
        priority: 1.3,
    },
    {
        name: 'stock_board_concept_cons_em',
        description: '概念板块成分股列表',
        category: '板块',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '板块名称', example: '人工智能' },
        ],
        returns: '股票代码、名称、现价、涨跌幅',
        triggers: ['概念成分股', '概念个股'],
        priority: 1.1,
    },

    // ==================== 高管持股 ====================
    {
        name: 'stock_hold_management_detail_em',
        description: '董监高及相关人员持股变动明细',
        category: '股东',
        parameters: [],
        returns: '股票代码、名称、变动人、变动数量、变动均价、变动原因',
        triggers: ['高管持股', '董监高', '增减持', '高管增持', '高管减持'],
        priority: 1.2,
    },
    {
        name: 'stock_hold_num_cninfo',
        description: '股东户数和人均持股数据',
        category: '股东',
        parameters: [
            { name: 'date', type: 'date', required: true, description: '日期', example: '20240101' },
        ],
        returns: '股票代码、名称、股东户数、人均持股、户数变化',
        triggers: ['股东户数', '人均持股', '筹码集中度'],
        priority: 1.1,
    },

    // ==================== 研报 ====================
    {
        name: 'stock_research_report_em',
        description: '个股研报列表',
        category: '研报',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '股票代码', example: '600519' },
        ],
        returns: '报告标题、机构名称、研究员、评级、目标价、发布日期',
        triggers: ['研报', '研究报告', '机构评级', '目标价'],
        priority: 1.3,
    },
    {
        name: 'stock_analyst_rank_em',
        description: '分析师排行榜',
        category: '研报',
        parameters: [
            { name: 'year', type: 'string', required: true, description: '年份', example: '2024' },
        ],
        returns: '分析师姓名、所属机构、研究方向、收益率、排名',
        triggers: ['分析师排名', '金牌分析师', '分析师收益'],
        priority: 1.0,
    },

    // ==================== 财务数据 ====================
    {
        name: 'stock_financial_report_sina',
        description: '个股财务报表数据（新浪）',
        category: '财务',
        parameters: [
            { name: 'stock', type: 'string', required: true, description: '股票代码', example: 'sh600519' },
            { name: 'symbol', type: 'string', required: true, description: '报表类型', example: '利润表' },
        ],
        returns: '报告期、营业收入、净利润、ROE等财务指标',
        triggers: ['财务报表', '利润表', '资产负债表', '现金流量表', '财报'],
        priority: 1.2,
    },
    {
        name: 'stock_profit_forecast_em',
        description: '盈利预测数据',
        category: '财务',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '股票代码', example: '600519' },
        ],
        returns: '年度、预测机构数、预测EPS、预测净利润',
        triggers: ['盈利预测', '业绩预测', 'EPS预测'],
        priority: 1.1,
    },

    // ==================== IPO / 新股 ====================
    {
        name: 'stock_ipo_info_em',
        description: '新股发行信息',
        category: 'IPO',
        parameters: [],
        returns: '股票代码、名称、发行价、申购日期、中签率、上市日期',
        triggers: ['新股', 'IPO', '申购', '打新'],
        priority: 1.2,
    },
    {
        name: 'stock_xgsglb_em',
        description: '新股申购一览表',
        category: 'IPO',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '市场', example: '全部股票' },
        ],
        returns: '股票代码、名称、申购代码、发行价、申购上限',
        triggers: ['新股申购', '申购一览', '今日申购'],
        priority: 1.1,
    },

    // ==================== 宏观数据 ====================
    {
        name: 'macro_china_gdp',
        description: '中国 GDP 季度数据',
        category: '宏观',
        parameters: [],
        returns: '季度、GDP、同比增长、环比增长',
        triggers: ['GDP', '国内生产总值', '经济增长'],
        priority: 1.3,
    },
    {
        name: 'macro_china_cpi_monthly',
        description: '中国 CPI 月度数据',
        category: '宏观',
        parameters: [],
        returns: '月份、CPI、同比增长、环比增长',
        triggers: ['CPI', '通胀', '物价指数', '消费者物价'],
        priority: 1.2,
    },
    {
        name: 'macro_china_ppi_yearly',
        description: '中国 PPI 年度数据',
        category: '宏观',
        parameters: [],
        returns: '年份、PPI、同比增长',
        triggers: ['PPI', '生产者物价', '工业品价格'],
        priority: 1.1,
    },
    {
        name: 'macro_china_money_supply',
        description: '中国货币供应量 M0/M1/M2',
        category: '宏观',
        parameters: [],
        returns: '月份、M0、M1、M2、同比增长',
        triggers: ['M2', '货币供应', '流动性', 'M1'],
        priority: 1.2,
    },

    // ==================== 涨停数据 ====================
    {
        name: 'stock_zt_pool_em',
        description: '涨停股票池',
        category: '涨停',
        parameters: [
            { name: 'date', type: 'date', required: true, description: '日期', example: '20240115' },
        ],
        returns: '股票代码、名称、涨停时间、连板数、涨停原因',
        triggers: ['涨停', '涨停板', '涨停股', '连板'],
        priority: 1.4,
    },
    {
        name: 'stock_zt_pool_strong_em',
        description: '强势涨停股池（封单金额大）',
        category: '涨停',
        parameters: [
            { name: 'date', type: 'date', required: true, description: '日期', example: '20240115' },
        ],
        returns: '股票代码、名称、封单金额、涨停原因',
        triggers: ['强势涨停', '封单', '涨停强度'],
        priority: 1.2,
    },
    {
        name: 'stock_zt_pool_previous_em',
        description: '昨日涨停今日表现',
        category: '涨停',
        parameters: [
            { name: 'date', type: 'date', required: true, description: '日期', example: '20240115' },
        ],
        returns: '股票代码、名称、今日涨跌幅、是否连板',
        triggers: ['昨日涨停', '涨停溢价', '连板率'],
        priority: 1.1,
    },

    // ==================== 基金数据 ====================
    {
        name: 'fund_etf_spot_em',
        description: 'ETF 实时行情',
        category: '基金',
        parameters: [],
        returns: '基金代码、名称、现价、涨跌幅、成交额',
        triggers: ['ETF', 'ETF行情', '基金行情'],
        priority: 1.2,
    },
    {
        name: 'fund_portfolio_hold_em',
        description: '基金重仓股持仓',
        category: '基金',
        parameters: [
            { name: 'symbol', type: 'string', required: true, description: '股票代码', example: '600519' },
            { name: 'date', type: 'string', required: true, description: '季度', example: '2024' },
        ],
        returns: '基金代码、基金名称、持股数量、持股市值、持股变化',
        triggers: ['基金持仓', '机构持仓', '重仓股'],
        priority: 1.3,
    },
];

/**
 * 根据用户查询匹配最佳接口
 */
export function matchAKShareEndpoint(query: string): AKShareEndpoint | null {
    const queryLower = query.toLowerCase();
    let bestMatch: AKShareEndpoint | null = null;
    let bestScore = 0;

    for (const endpoint of AKSHARE_CATALOG) {
        let score = 0;

        for (const trigger of endpoint.triggers) {
            if (queryLower.includes(trigger.toLowerCase())) {
                score += trigger.length * endpoint.priority;
            }
        }

        if (queryLower.includes(endpoint.category.toLowerCase())) {
            score += 5 * endpoint.priority;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = endpoint;
        }
    }

    return bestScore > 0 ? bestMatch : null;
}

/**
 * 获取所有接口的分类
 */
export function getAKShareCategories(): string[] {
    const categories = new Set<string>();
    for (const endpoint of AKSHARE_CATALOG) {
        categories.add(endpoint.category);
    }
    return Array.from(categories);
}

/**
 * 根据分类获取接口
 */
export function getEndpointsByCategory(category: string): AKShareEndpoint[] {
    return AKSHARE_CATALOG.filter(e => e.category === category);
}

/**
 * 生成接口目录的 Markdown 格式（供 LLM 参考）
 */
export function generateCatalogMarkdown(): string {
    const lines = ['# AKShare 接口目录\n'];
    
    const categories = getAKShareCategories();
    
    for (const category of categories) {
        lines.push(`## ${category}\n`);
        const endpoints = getEndpointsByCategory(category);
        
        for (const ep of endpoints) {
            lines.push(`### ${ep.name}`);
            lines.push(`- **描述**: ${ep.description}`);
            lines.push(`- **触发词**: ${ep.triggers.join(', ')}`);
            if (ep.parameters.length > 0) {
                lines.push(`- **参数**:`);
                for (const param of ep.parameters) {
                    lines.push(`  - \`${param.name}\` (${param.type}${param.required ? ', 必填' : ''}): ${param.description}`);
                }
            }
            lines.push(`- **返回**: ${ep.returns}`);
            lines.push('');
        }
    }
    
    return lines.join('\n');
}

/**
 * 根据接口名获取详细信息
 */
export function getEndpointByName(name: string): AKShareEndpoint | undefined {
    return AKSHARE_CATALOG.find(e => e.name === name);
}
