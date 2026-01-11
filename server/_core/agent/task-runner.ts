/**
 * TaskRunner - 子任务执行器
 * 
 * 核心功能：
 * 1. 并行/串行执行多个子任务
 * 2. 依赖管理
 * 3. 超时控制
 * 4. 结果聚合
 */

import type { TaskDefinition, TaskResult, StreamEvent } from './types';
import { BaseAgent } from './base-agent';

export interface TaskRunnerConfig {
    maxConcurrency: number;
    defaultTimeout: number;
    verbose: boolean;
}

export class TaskRunner {
    private config: TaskRunnerConfig;
    private agentFactory: (type: string) => BaseAgent;
    private results: Map<string, TaskResult>;

    constructor(
        agentFactory: (type: string) => BaseAgent,
        config: Partial<TaskRunnerConfig> = {}
    ) {
        this.agentFactory = agentFactory;
        this.config = {
            maxConcurrency: 3,
            defaultTimeout: 60000,
            verbose: true,
            ...config,
        };
        this.results = new Map();
    }

    /**
     * 执行单个任务
     */
    async runTask(task: TaskDefinition): Promise<TaskResult> {
        const startTime = Date.now();
        const agent = this.agentFactory(task.agentType || 'default');

        try {
            this.log(`🚀 开始任务: ${task.id} - ${task.description}`);

            const contextPrompt = task.context
                ? `\n\n【上下文】\n${JSON.stringify(task.context, null, 2)}`
                : '';

            const result = await Promise.race([
                agent.run(task.prompt + contextPrompt),
                this.timeout(task.timeout || this.config.defaultTimeout),
            ]);

            const taskResult: TaskResult = {
                id: task.id,
                success: true,
                result: result as string,
                duration: Date.now() - startTime,
                toolsUsed: agent.getToolStats().map(t => t.name),
                iterations: agent.getThinking().length,
            };

            this.results.set(task.id, taskResult);
            this.log(`✅ 任务完成: ${task.id} (${taskResult.duration}ms)`);

            return taskResult;

        } catch (error: any) {
            const taskResult: TaskResult = {
                id: task.id,
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                toolsUsed: agent.getToolStats().map(t => t.name),
                iterations: agent.getThinking().length,
            };

            this.results.set(task.id, taskResult);
            this.log(`❌ 任务失败: ${task.id} - ${error.message}`);

            return taskResult;
        }
    }

    /**
     * 并行执行多个独立任务
     */
    async runParallel(tasks: TaskDefinition[]): Promise<TaskResult[]> {
        this.log(`\n📦 并行执行 ${tasks.length} 个任务`);

        const chunks = this.chunk(tasks, this.config.maxConcurrency);
        const results: TaskResult[] = [];

        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(
                chunk.map(task => this.runTask(task))
            );

            for (const result of chunkResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        id: 'unknown',
                        success: false,
                        error: result.reason?.message || 'Unknown error',
                        duration: 0,
                        toolsUsed: [],
                        iterations: 0,
                    });
                }
            }
        }

        return results;
    }

    /**
     * 按依赖顺序执行任务
     */
    async runWithDependencies(tasks: TaskDefinition[]): Promise<TaskResult[]> {
        this.log(`\n📦 按依赖执行 ${tasks.length} 个任务`);

        const completed = new Set<string>();
        const results: TaskResult[] = [];
        const pending = [...tasks];

        while (pending.length > 0) {
            const readyTasks = pending.filter(task => {
                if (!task.dependencies || task.dependencies.length === 0) {
                    return true;
                }
                return task.dependencies.every(dep => completed.has(dep));
            });

            if (readyTasks.length === 0 && pending.length > 0) {
                throw new Error('检测到循环依赖或缺失依赖');
            }

            const readyResults = await this.runParallel(readyTasks);
            results.push(...readyResults);

            for (const task of readyTasks) {
                completed.add(task.id);
                const idx = pending.findIndex(t => t.id === task.id);
                if (idx !== -1) pending.splice(idx, 1);
            }
        }

        return results;
    }

    /**
     * 流式执行任务（返回 AsyncGenerator）
     */
    async *streamTask(task: TaskDefinition): AsyncGenerator<StreamEvent> {
        const startTime = Date.now();
        const agent = this.agentFactory(task.agentType || 'default');

        yield { type: 'task_start', data: { id: task.id, description: task.description } };

        try {
            const contextPrompt = task.context
                ? `\n\n【上下文】\n${JSON.stringify(task.context, null, 2)}`
                : '';

            for await (const event of agent.stream(task.prompt + contextPrompt)) {
                yield event;
            }

            yield {
                type: 'task_complete',
                data: {
                    id: task.id,
                    success: true,
                    duration: Date.now() - startTime,
                },
            };

        } catch (error: any) {
            yield {
                type: 'task_complete',
                data: {
                    id: task.id,
                    success: false,
                    error: error.message,
                    duration: Date.now() - startTime,
                },
            };
        }
    }

    /**
     * 获取任务结果
     */
    getResult(taskId: string): TaskResult | undefined {
        return this.results.get(taskId);
    }

    /**
     * 获取所有结果
     */
    getAllResults(): TaskResult[] {
        return Array.from(this.results.values());
    }

    /**
     * 聚合结果为报告
     */
    summarizeResults(): string {
        const results = this.getAllResults();
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

        const lines = [
            `## 任务执行报告`,
            ``,
            `- 总任务数: ${results.length}`,
            `- 成功: ${successful.length}`,
            `- 失败: ${failed.length}`,
            `- 总耗时: ${totalDuration}ms`,
            ``,
        ];

        if (successful.length > 0) {
            lines.push(`### ✅ 成功任务`);
            for (const r of successful) {
                lines.push(`- **${r.id}**: ${r.duration}ms, 工具: ${r.toolsUsed.join(', ') || '无'}`);
            }
            lines.push(``);
        }

        if (failed.length > 0) {
            lines.push(`### ❌ 失败任务`);
            for (const r of failed) {
                lines.push(`- **${r.id}**: ${r.error}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * 清空结果
     */
    clear(): void {
        this.results.clear();
    }

    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`任务超时 (${ms}ms)`)), ms);
        });
    }

    private chunk<T>(arr: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    private log(message: string): void {
        if (this.config.verbose) {
            console.log(message);
        }
    }
}
