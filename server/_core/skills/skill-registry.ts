/**
 * SkillRegistry - 技能注册和管理
 * 
 * 功能：
 * 1. 加载 SKILL.md 定义文件
 * 2. 技能匹配和选择
 * 3. 技能执行
 * 4. 动态注册
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Skill {
    name: string;
    description: string;
    triggers: string[];
    instructions: string;
    tools?: string[];
    examples?: string[];
    workflow?: string[];
    priority?: number;
}

export interface SkillMatch {
    skill: Skill;
    score: number;
    matchedTrigger?: string;
}

export class SkillRegistry {
    private skills: Map<string, Skill>;
    private skillsPath: string;

    constructor(skillsPath?: string) {
        this.skills = new Map();
        this.skillsPath = skillsPath || path.join(process.cwd(), 'server', '_core', 'skills', 'definitions');

        this.loadBuiltinSkills();
        this.loadSkillsFromDir();
    }

    /**
     * 注册技能
     */
    registerSkill(skill: Skill): void {
        this.skills.set(skill.name, skill);
        console.log(`[SkillRegistry] Registered: ${skill.name}`);
    }

    /**
     * 获取技能
     */
    getSkill(name: string): Skill | undefined {
        return this.skills.get(name);
    }

    /**
     * 列出所有技能
     */
    listSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    /**
     * 匹配技能
     */
    matchSkills(query: string): SkillMatch[] {
        const queryLower = query.toLowerCase();
        const matches: SkillMatch[] = [];

        for (const skill of Array.from(this.skills.values())) {
            let maxScore = 0;
            let matchedTrigger: string | undefined;

            for (const trigger of skill.triggers) {
                const triggerLower = trigger.toLowerCase();

                if (queryLower.includes(triggerLower)) {
                    const score = triggerLower.length / queryLower.length;
                    if (score > maxScore) {
                        maxScore = score;
                        matchedTrigger = trigger;
                    }
                }

                const words = triggerLower.split(/\s+/);
                const matchedWords = words.filter(w => queryLower.includes(w));
                const wordScore = matchedWords.length / words.length * 0.5;
                if (wordScore > maxScore) {
                    maxScore = wordScore;
                    matchedTrigger = trigger;
                }
            }

            if (maxScore > 0.1) {
                matches.push({
                    skill,
                    score: maxScore * (skill.priority || 1),
                    matchedTrigger,
                });
            }
        }

        matches.sort((a, b) => b.score - a.score);
        return matches;
    }

    /**
     * 获取最佳匹配技能
     */
    getBestMatch(query: string): Skill | null {
        const matches = this.matchSkills(query);
        return matches.length > 0 ? matches[0].skill : null;
    }

    /**
     * 生成技能提示词
     */
    generateSkillPrompt(skillName: string): string {
        const skill = this.skills.get(skillName);
        if (!skill) return '';

        const lines = [
            `# 技能: ${skill.name}`,
            '',
            `## 描述`,
            skill.description,
            '',
            `## 指令`,
            skill.instructions,
            '',
        ];

        if (skill.workflow && skill.workflow.length > 0) {
            lines.push(`## 工作流程`);
            skill.workflow.forEach((step, i) => {
                lines.push(`${i + 1}. ${step}`);
            });
            lines.push('');
        }

        if (skill.tools && skill.tools.length > 0) {
            lines.push(`## 可用工具`);
            lines.push(skill.tools.join(', '));
            lines.push('');
        }

        if (skill.examples && skill.examples.length > 0) {
            lines.push(`## 示例`);
            for (const example of skill.examples) {
                lines.push(`- ${example}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * 从 Markdown 文件解析技能
     */
    parseSkillFromMarkdown(content: string): Skill | null {
        try {
            const lines = content.split('\n');
            let name = '';
            let description = '';
            let triggers: string[] = [];
            let instructions = '';
            let tools: string[] = [];
            let examples: string[] = [];
            let workflow: string[] = [];
            let priority = 1;

            let currentSection = '';
            let sectionContent: string[] = [];

            const saveSection = () => {
                const text = sectionContent.join('\n').trim();
                switch (currentSection.toLowerCase()) {
                    case 'description':
                    case '描述':
                        description = text;
                        break;
                    case 'triggers':
                    case '触发词':
                        triggers = text.split('\n')
                            .map(l => l.replace(/^[-*]\s*/, '').trim())
                            .filter(l => l);
                        break;
                    case 'instructions':
                    case '指令':
                        instructions = text;
                        break;
                    case 'tools':
                    case '工具':
                        tools = text.split(/[,\n]/)
                            .map(t => t.replace(/^[-*]\s*/, '').trim())
                            .filter(t => t);
                        break;
                    case 'examples':
                    case '示例':
                        examples = text.split('\n')
                            .map(l => l.replace(/^[-*]\s*/, '').trim())
                            .filter(l => l);
                        break;
                    case 'workflow':
                    case '工作流':
                        workflow = text.split('\n')
                            .map(l => l.replace(/^\d+\.\s*/, '').trim())
                            .filter(l => l);
                        break;
                }
                sectionContent = [];
            };

            for (const line of lines) {
                if (line.startsWith('# ')) {
                    name = line.slice(2).trim();
                } else if (line.startsWith('## ')) {
                    saveSection();
                    currentSection = line.slice(3).trim();
                } else if (currentSection) {
                    sectionContent.push(line);
                }
            }
            saveSection();

            if (!name || !description) {
                return null;
            }

            return {
                name,
                description,
                triggers: triggers.length > 0 ? triggers : [name],
                instructions: instructions || description,
                tools,
                examples,
                workflow,
                priority,
            };
        } catch (error) {
            console.error('[SkillRegistry] Parse error:', error);
            return null;
        }
    }

    /**
     * 从文件加载技能
     */
    loadSkillFromFile(filePath: string): boolean {
        try {
            if (!fs.existsSync(filePath)) return false;

            const content = fs.readFileSync(filePath, 'utf-8');
            const skill = this.parseSkillFromMarkdown(content);

            if (skill) {
                this.registerSkill(skill);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`[SkillRegistry] Load failed for ${filePath}:`, error);
            return false;
        }
    }

    /**
     * 从目录加载所有技能
     */
    private loadSkillsFromDir(): void {
        try {
            if (!fs.existsSync(this.skillsPath)) {
                fs.mkdirSync(this.skillsPath, { recursive: true });
                return;
            }

            const files = fs.readdirSync(this.skillsPath);

            for (const file of files) {
                if (file.endsWith('.md')) {
                    this.loadSkillFromFile(path.join(this.skillsPath, file));
                }
            }
        } catch (error) {
            console.error('[SkillRegistry] Load dir failed:', error);
        }
    }

    /**
     * 加载内置技能
     */
    private loadBuiltinSkills(): void {
        this.registerSkill({
            name: 'stock-analysis',
            description: '分析股票的技术面、资金面和基本面',
            triggers: ['分析', '技术面', '怎么看', '能不能买', '什么情况'],
            instructions: `
执行完整的股票分析：
1. 获取实时行情 (get_stock_quote)
2. 技术分析 (analyze_stock_technical)
3. 资金流向 (get_fund_flow + get_fund_flow_history)
4. 综合判断给出操作建议
`,
            tools: ['get_stock_quote', 'analyze_stock_technical', 'get_fund_flow', 'get_fund_flow_history'],
            workflow: [
                '获取股票实时行情',
                '执行技术面分析',
                '获取资金流向数据',
                '综合分析并给出买卖建议',
            ],
            priority: 1.5,
        });

        this.registerSkill({
            name: 'research-report',
            description: '生成深度研究报告',
            triggers: ['研究', '报告', '调研', '深度分析'],
            instructions: `
生成完整的研究报告：
1. 收集基本面数据
2. 获取龙虎榜和资金数据
3. 分析行业地位
4. 输出格式化报告
`,
            tools: ['get_stock_quote', 'get_longhu_bang', 'get_fund_flow_rank', 'get_market_news'],
            workflow: [
                '获取公司基本信息',
                '获取龙虎榜数据',
                '分析资金流向趋势',
                '收集相关新闻',
                '生成研究报告',
            ],
            priority: 1.2,
        });

        this.registerSkill({
            name: 'signal-backtest',
            description: '回测交易信号的历史表现',
            triggers: ['回测', '测试信号', '验证策略', '历史表现'],
            instructions: `
执行信号回测：
1. 获取历史K线数据
2. 识别信号触发点
3. 计算收益统计
4. 输出回测报告
`,
            tools: ['get_kline_data', 'analyze_stock_technical'],
            workflow: [
                '定义信号条件',
                '获取历史数据',
                '遍历识别信号',
                '计算收益统计',
                '生成回测报告',
            ],
            priority: 1.0,
        });

        this.registerSkill({
            name: 'market-scan',
            description: '扫描全市场寻找符合条件的股票',
            triggers: ['扫描', '选股', '找股票', '筛选', '全市场'],
            instructions: `
全市场扫描：
1. 获取涨停股池
2. 获取资金流入排行
3. 获取龙虎榜
4. 筛选符合条件的标的
`,
            tools: ['get_zt_pool', 'get_fund_flow_rank', 'get_longhu_bang'],
            workflow: [
                '获取涨停股池',
                '获取资金流入TOP',
                '获取龙虎榜数据',
                '综合筛选输出结果',
            ],
            priority: 1.1,
        });
    }

    /**
     * 导出技能列表给 AI
     */
    exportForAI(): string {
        const skills = this.listSkills();

        const lines = [
            '## 可用技能\n',
            '以下技能可以帮助你完成特定任务：\n',
        ];

        for (const skill of skills) {
            lines.push(`### ${skill.name}`);
            lines.push(`- **描述**: ${skill.description}`);
            lines.push(`- **触发词**: ${skill.triggers.join(', ')}`);
            if (skill.tools && skill.tools.length > 0) {
                lines.push(`- **工具**: ${skill.tools.join(', ')}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }
}

let globalSkillRegistry: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
    if (!globalSkillRegistry) {
        globalSkillRegistry = new SkillRegistry();
    }
    return globalSkillRegistry;
}
