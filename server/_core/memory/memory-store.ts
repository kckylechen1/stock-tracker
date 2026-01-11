/**
 * MemoryStore - 智能记忆系统
 * 
 * 功能：
 * 1. 短期记忆 - 当前会话上下文
 * 2. 长期记忆 - 跨会话持久化
 * 3. 语义检索 - 相似记忆匹配
 * 4. 自动注入 - 相关记忆自动添加到 prompt
 */

import * as fs from 'fs';
import * as path from 'path';

export type MemoryType = 'fact' | 'lesson' | 'preference' | 'trade' | 'insight';

export interface MemoryEntry {
    id: string;
    type: MemoryType;
    content: string;
    keywords: string[];
    stockCode?: string;
    createdAt: string;
    accessedAt: string;
    accessCount: number;
    importance: number;
    metadata?: Record<string, any>;
}

export interface MemoryStoreConfig {
    storagePath: string;
    maxMemories: number;
    decayRate: number;
}

export class MemoryStore {
    private config: MemoryStoreConfig;
    private memories: Map<string, MemoryEntry>;
    private shortTermMemory: Map<string, string[]>;

    constructor(config: Partial<MemoryStoreConfig> = {}) {
        this.config = {
            storagePath: path.join(process.cwd(), 'data', 'memories.json'),
            maxMemories: 1000,
            decayRate: 0.95,
            ...config,
        };

        this.memories = new Map();
        this.shortTermMemory = new Map();

        this.load();
    }

    /**
     * 添加记忆
     */
    addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>): string {
        const id = this.generateId();
        const now = new Date().toISOString();

        const memory: MemoryEntry = {
            ...entry,
            id,
            createdAt: now,
            accessedAt: now,
            accessCount: 0,
        };

        this.memories.set(id, memory);
        this.save();

        return id;
    }

    /**
     * 添加事实记忆
     */
    addFact(content: string, keywords: string[], stockCode?: string): string {
        return this.addMemory({
            type: 'fact',
            content,
            keywords,
            stockCode,
            importance: 0.5,
        });
    }

    /**
     * 添加教训记忆
     */
    addLesson(content: string, keywords: string[], stockCode?: string): string {
        return this.addMemory({
            type: 'lesson',
            content,
            keywords,
            stockCode,
            importance: 0.8,
        });
    }

    /**
     * 添加偏好记忆
     */
    addPreference(content: string, keywords: string[]): string {
        return this.addMemory({
            type: 'preference',
            content,
            keywords,
            importance: 0.6,
        });
    }

    /**
     * 添加交易记忆
     */
    addTrade(content: string, stockCode: string, metadata?: Record<string, any>): string {
        return this.addMemory({
            type: 'trade',
            content,
            keywords: [stockCode],
            stockCode,
            importance: 0.7,
            metadata,
        });
    }

    /**
     * 添加洞察记忆
     */
    addInsight(content: string, keywords: string[]): string {
        return this.addMemory({
            type: 'insight',
            content,
            keywords,
            importance: 0.9,
        });
    }

    /**
     * 检索相关记忆
     */
    recall(query: string, options: {
        type?: MemoryType;
        stockCode?: string;
        limit?: number;
        minImportance?: number;
    } = {}): MemoryEntry[] {
        const { type, stockCode, limit = 10, minImportance = 0.3 } = options;

        const queryKeywords = this.extractKeywords(query);

        let candidates = Array.from(this.memories.values());

        if (type) {
            candidates = candidates.filter(m => m.type === type);
        }

        if (stockCode) {
            candidates = candidates.filter(m =>
                !m.stockCode || m.stockCode === stockCode
            );
        }

        candidates = candidates.filter(m => m.importance >= minImportance);

        const scored = candidates.map(memory => {
            const keywordScore = this.calculateKeywordScore(queryKeywords, memory.keywords);
            const recencyScore = this.calculateRecencyScore(memory);
            const importanceScore = memory.importance;
            const accessScore = Math.min(memory.accessCount / 10, 1) * 0.1;

            const totalScore =
                keywordScore * 0.4 +
                recencyScore * 0.2 +
                importanceScore * 0.3 +
                accessScore * 0.1;

            return { memory, score: totalScore };
        });

        scored.sort((a, b) => b.score - a.score);

        const results = scored.slice(0, limit).map(s => s.memory);

        for (const memory of results) {
            this.updateAccess(memory.id);
        }

        return results;
    }

    /**
     * 按股票检索记忆
     */
    recallByStock(stockCode: string, limit = 5): MemoryEntry[] {
        const memories = Array.from(this.memories.values())
            .filter(m => m.stockCode === stockCode)
            .sort((a, b) => b.importance - a.importance);

        return memories.slice(0, limit);
    }

    /**
     * 检索所有教训
     */
    recallLessons(stockCode?: string): MemoryEntry[] {
        return this.recall('', {
            type: 'lesson',
            stockCode,
            limit: 20,
        });
    }

    /**
     * 生成上下文注入文本
     */
    generateContextInjection(query: string, stockCode?: string): string {
        const memories = this.recall(query, { stockCode, limit: 5 });

        if (memories.length === 0) {
            return '';
        }

        const lines = ['## 相关记忆\n'];

        const byType = new Map<MemoryType, MemoryEntry[]>();
        for (const m of memories) {
            const list = byType.get(m.type) || [];
            list.push(m);
            byType.set(m.type, list);
        }

        const typeLabels: Record<MemoryType, string> = {
            lesson: '⚠️ 历史教训',
            trade: '📊 交易记录',
            preference: '⚙️ 用户偏好',
            fact: '📝 已知事实',
            insight: '💡 重要洞察',
        };

        for (const [type, entries] of Array.from(byType.entries())) {
            lines.push(`### ${typeLabels[type]}\n`);
            for (const entry of entries) {
                lines.push(`- ${entry.content}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * 短期记忆操作
     */
    setShortTerm(sessionId: string, key: string, value: string): void {
        const sessionMemory = this.shortTermMemory.get(sessionId) || [];
        sessionMemory.push(`${key}: ${value}`);
        this.shortTermMemory.set(sessionId, sessionMemory.slice(-20));
    }

    getShortTerm(sessionId: string): string[] {
        return this.shortTermMemory.get(sessionId) || [];
    }

    clearShortTerm(sessionId: string): void {
        this.shortTermMemory.delete(sessionId);
    }

    /**
     * 更新访问记录
     */
    private updateAccess(id: string): void {
        const memory = this.memories.get(id);
        if (memory) {
            memory.accessedAt = new Date().toISOString();
            memory.accessCount++;
        }
    }

    /**
     * 删除记忆
     */
    deleteMemory(id: string): boolean {
        const deleted = this.memories.delete(id);
        if (deleted) {
            this.save();
        }
        return deleted;
    }

    /**
     * 清理低重要性的旧记忆
     */
    cleanup(): number {
        if (this.memories.size <= this.config.maxMemories) {
            return 0;
        }

        const sorted = Array.from(this.memories.values())
            .map(m => ({
                id: m.id,
                score: m.importance * this.calculateRecencyScore(m),
            }))
            .sort((a, b) => a.score - b.score);

        const toDelete = sorted.slice(0, this.memories.size - this.config.maxMemories);

        for (const item of toDelete) {
            this.memories.delete(item.id);
        }

        this.save();
        return toDelete.length;
    }

    /**
     * 衰减重要性
     */
    decayImportance(): void {
        for (const memory of Array.from(this.memories.values())) {
            if (memory.type !== 'lesson' && memory.type !== 'preference') {
                memory.importance *= this.config.decayRate;
            }
        }
        this.save();
    }

    /**
     * 提升记忆重要性
     */
    boostImportance(id: string, boost: number = 0.1): void {
        const memory = this.memories.get(id);
        if (memory) {
            memory.importance = Math.min(1, memory.importance + boost);
            this.save();
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        total: number;
        byType: Record<MemoryType, number>;
        avgImportance: number;
    } {
        const byType: Record<MemoryType, number> = {
            fact: 0,
            lesson: 0,
            preference: 0,
            trade: 0,
            insight: 0,
        };

        let totalImportance = 0;

        for (const memory of Array.from(this.memories.values())) {
            byType[memory.type]++;
            totalImportance += memory.importance;
        }

        return {
            total: this.memories.size,
            byType,
            avgImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
        };
    }

    private extractKeywords(text: string): string[] {
        const words = text.toLowerCase()
            .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1);

        return Array.from(new Set(words));
    }

    private calculateKeywordScore(queryKeywords: string[], memoryKeywords: string[]): number {
        if (queryKeywords.length === 0 || memoryKeywords.length === 0) {
            return 0;
        }

        const memorySet = new Set(memoryKeywords.map(k => k.toLowerCase()));
        const matches = queryKeywords.filter(k => memorySet.has(k.toLowerCase()));

        return matches.length / Math.max(queryKeywords.length, 1);
    }

    private calculateRecencyScore(memory: MemoryEntry): number {
        const now = Date.now();
        const accessed = new Date(memory.accessedAt).getTime();
        const daysSinceAccess = (now - accessed) / (1000 * 60 * 60 * 24);

        return Math.exp(-daysSinceAccess / 30);
    }

    private generateId(): string {
        return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    private save(): void {
        try {
            const dir = path.dirname(this.config.storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = Array.from(this.memories.values());
            fs.writeFileSync(this.config.storagePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('[MemoryStore] Save failed:', error);
        }
    }

    private load(): void {
        try {
            if (fs.existsSync(this.config.storagePath)) {
                const data = fs.readFileSync(this.config.storagePath, 'utf-8');
                const entries = JSON.parse(data) as MemoryEntry[];

                for (const entry of entries) {
                    this.memories.set(entry.id, entry);
                }

                console.log(`[MemoryStore] Loaded ${this.memories.size} memories`);
            }
        } catch (error) {
            console.error('[MemoryStore] Load failed:', error);
        }
    }
}

let globalMemoryStore: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
    if (!globalMemoryStore) {
        globalMemoryStore = new MemoryStore();
    }
    return globalMemoryStore;
}
