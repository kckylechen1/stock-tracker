/**
 * GLM-4.7 vs Grok 对比测试脚本
 * 测试两个模型对相同股票分析问题的回答质量
 */

import 'dotenv/config';

// API 配置
const CONFIG = {
    glm: {
        url: process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4',
        key: process.env.GLM_API_KEY || '',
        model: process.env.GLM_MODEL || 'glm-4.7',
    },
    grok: {
        url: process.env.GROK_API_URL || 'https://api.x.ai/v1',
        key: process.env.GROK_API_KEY || '',
        model: process.env.GROK_MODEL || 'grok-4-1-fast-reasoning',
    },
};

// 测试问题 - 股票分析场景
const TEST_PROMPT = `分析一下"中际旭创"这只股票的投资价值：
1. 它的主营业务是什么？
2. 在AI算力和光通信领域的竞争优势
3. 当前估值是否合理？
4. 给出你的投资建议（做多/观望/做空）`;

const SYSTEM_PROMPT = '你是一位专业的A股投资分析师，擅长分析科技股和成长股。请给出直接、有操作性的建议。';

interface ModelResponse {
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    duration: number;
    error?: string;
}

async function callGLM(): Promise<ModelResponse> {
    console.log('\n🔷 调用 GLM-4.7...');
    const startTime = Date.now();

    try {
        const response = await fetch(`${CONFIG.glm.url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.glm.key}`,
            },
            body: JSON.stringify({
                model: CONFIG.glm.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: TEST_PROMPT },
                ],
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        const duration = (Date.now() - startTime) / 1000;

        if (!response.ok) {
            const errorText = await response.text();
            return { content: '', tokens: { prompt: 0, completion: 0, total: 0 }, duration, error: errorText };
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '无响应',
            tokens: {
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0,
                total: data.usage?.total_tokens || 0,
            },
            duration,
        };
    } catch (error: any) {
        return { content: '', tokens: { prompt: 0, completion: 0, total: 0 }, duration: 0, error: error.message };
    }
}

async function callGrok(): Promise<ModelResponse> {
    console.log('\n🔶 调用 Grok...');
    const startTime = Date.now();

    try {
        const response = await fetch(`${CONFIG.grok.url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.grok.key}`,
            },
            body: JSON.stringify({
                model: CONFIG.grok.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: TEST_PROMPT },
                ],
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        const duration = (Date.now() - startTime) / 1000;

        if (!response.ok) {
            const errorText = await response.text();
            return { content: '', tokens: { prompt: 0, completion: 0, total: 0 }, duration, error: errorText };
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '无响应',
            tokens: {
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0,
                total: data.usage?.total_tokens || 0,
            },
            duration,
        };
    } catch (error: any) {
        return { content: '', tokens: { prompt: 0, completion: 0, total: 0 }, duration: 0, error: error.message };
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('🆚  GLM-4.7 vs Grok 对比测试');
    console.log('='.repeat(70));
    console.log(`\n📋 测试问题:\n${TEST_PROMPT}`);
    console.log('\n' + '-'.repeat(70));

    // 并行调用两个模型
    const [glmResult, grokResult] = await Promise.all([callGLM(), callGrok()]);

    // 显示 GLM 结果
    console.log('\n' + '='.repeat(70));
    console.log(`🔷 GLM-4.7 (${CONFIG.glm.model})`);
    console.log('='.repeat(70));
    if (glmResult.error) {
        console.log(`❌ 错误: ${glmResult.error}`);
    } else {
        console.log(`⏱️  耗时: ${glmResult.duration.toFixed(2)}s`);
        console.log(`📊 Token: prompt=${glmResult.tokens.prompt}, completion=${glmResult.tokens.completion}`);
        console.log(`\n📝 回复:\n${'-'.repeat(50)}`);
        console.log(glmResult.content);
    }

    // 显示 Grok 结果
    console.log('\n' + '='.repeat(70));
    console.log(`🔶 Grok (${CONFIG.grok.model})`);
    console.log('='.repeat(70));
    if (grokResult.error) {
        console.log(`❌ 错误: ${grokResult.error}`);
    } else {
        console.log(`⏱️  耗时: ${grokResult.duration.toFixed(2)}s`);
        console.log(`📊 Token: prompt=${grokResult.tokens.prompt}, completion=${grokResult.tokens.completion}`);
        console.log(`\n📝 回复:\n${'-'.repeat(50)}`);
        console.log(grokResult.content);
    }

    // 对比摘要
    console.log('\n' + '='.repeat(70));
    console.log('📊 对比摘要');
    console.log('='.repeat(70));
    console.log(`| 指标     | GLM-4.7           | Grok              |`);
    console.log(`|----------|-------------------|-------------------|`);
    console.log(`| 耗时     | ${glmResult.duration.toFixed(2).padEnd(17)}s | ${grokResult.duration.toFixed(2).padEnd(17)}s |`);
    console.log(`| Token    | ${String(glmResult.tokens.total).padEnd(17)} | ${String(grokResult.tokens.total).padEnd(17)} |`);
    console.log(`| 状态     | ${(glmResult.error ? '❌ 失败' : '✅ 成功').padEnd(17)} | ${(grokResult.error ? '❌ 失败' : '✅ 成功').padEnd(17)} |`);

    console.log('\n✨ 测试完成！');
}

main();
