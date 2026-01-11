/**
 * SessionStore - 会话存储管理
 * 
 * 功能：
 * 1. 持久化存储会话
 * 2. 会话恢复
 * 3. 上下文压缩
 * 4. 自动清理过期会话
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentMessage } from '../agent/types';

export interface SessionMetadata {
    stockCode?: string;
    taskHistory: string[];
    tokenUsage: number;
    lastActivity: string;
    detailMode?: boolean; // 是否启用详细输出模式
}

export interface Session {
    id: string;
    createdAt: string;
    updatedAt: string;
    messages: AgentMessage[];
    metadata: SessionMetadata;
}

export interface SessionStoreConfig {
    storagePath: string;
    maxSessionAge: number;
    maxMessagesPerSession: number;
    autoSave: boolean;
}

export class SessionStore {
    private config: SessionStoreConfig;
    private sessions: Map<string, Session>;
    private dirty: Set<string>;

    constructor(config: Partial<SessionStoreConfig> = {}) {
        this.config = {
            storagePath: path.join(process.cwd(), 'data', 'sessions'),
            maxSessionAge: 7 * 24 * 60 * 60 * 1000,
            maxMessagesPerSession: 100,
            autoSave: true,
            ...config,
        };

        this.sessions = new Map();
        this.dirty = new Set();

        this.ensureStorageDir();
        this.loadAllSessions();
    }

    private ensureStorageDir(): void {
        if (!fs.existsSync(this.config.storagePath)) {
            fs.mkdirSync(this.config.storagePath, { recursive: true });
        }
    }

    private getSessionPath(sessionId: string): string {
        return path.join(this.config.storagePath, `${sessionId}.json`);
    }

    /**
     * 创建新会话
     */
    createSession(stockCode?: string): Session {
        const id = this.generateSessionId();
        const now = new Date().toISOString();

        const session: Session = {
            id,
            createdAt: now,
            updatedAt: now,
            messages: [],
            metadata: {
                stockCode,
                taskHistory: [],
                tokenUsage: 0,
                lastActivity: now,
            },
        };

        this.sessions.set(id, session);
        this.markDirty(id);

        if (this.config.autoSave) {
            this.saveSession(id);
        }

        return session;
    }

    /**
     * 获取会话
     */
    getSession(sessionId: string): Session | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * 获取或创建会话
     */
    getOrCreateSession(sessionId?: string, stockCode?: string): Session {
        if (sessionId) {
            const existing = this.getSession(sessionId);
            if (existing) {
                return existing;
            }
        }

        return this.createSession(stockCode);
    }

    /**
     * 添加消息到会话
     */
    addMessage(sessionId: string, message: AgentMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        session.messages.push(message);
        session.updatedAt = new Date().toISOString();
        session.metadata.lastActivity = session.updatedAt;

        if (session.messages.length > this.config.maxMessagesPerSession) {
            this.compressContext(sessionId);
        }

        this.markDirty(sessionId);

        if (this.config.autoSave) {
            this.saveSession(sessionId);
        }
    }

    /**
     * 批量添加消息
     */
    addMessages(sessionId: string, messages: AgentMessage[]): void {
        for (const msg of messages) {
            this.addMessage(sessionId, msg);
        }
    }

    /**
     * 获取会话消息
     */
    getMessages(sessionId: string): AgentMessage[] {
        const session = this.sessions.get(sessionId);
        return session ? [...session.messages] : [];
    }

    /**
     * 压缩上下文（保留重要消息，压缩中间内容）
     */
    compressContext(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const messages = session.messages;
        if (messages.length <= 20) return;

        const systemMessages = messages.filter(m => m.role === 'system');
        const recentMessages = messages.slice(-15);
        const importantMessages = messages
            .slice(systemMessages.length, -15)
            .filter((m, i) => {
                if (m.role === 'tool') return false;
                if (m.tool_calls && m.tool_calls.length > 0) return false;
                if (i % 5 === 0) return true;
                return false;
            });

        const summaryMessage: AgentMessage = {
            role: 'system',
            content: `[上下文压缩] 之前有 ${messages.length - systemMessages.length - recentMessages.length} 条消息被压缩。`,
        };

        session.messages = [
            ...systemMessages,
            summaryMessage,
            ...importantMessages,
            ...recentMessages,
        ];

        this.markDirty(sessionId);
    }

    /**
     * 更新会话元数据
     */
    updateMetadata(sessionId: string, updates: Partial<SessionMetadata>): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.metadata = { ...session.metadata, ...updates };
        session.updatedAt = new Date().toISOString();

        this.markDirty(sessionId);

        if (this.config.autoSave) {
            this.saveSession(sessionId);
        }
    }

    /**
     * 记录任务到会话
     */
    recordTask(sessionId: string, taskDescription: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.metadata.taskHistory.push(
            `[${new Date().toISOString()}] ${taskDescription}`
        );

        this.markDirty(sessionId);
    }

    /**
     * 删除会话
     */
    deleteSession(sessionId: string): boolean {
        const filePath = this.getSessionPath(sessionId);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        this.sessions.delete(sessionId);
        this.dirty.delete(sessionId);

        return true;
    }

    /**
     * 清理过期会话
     */
    cleanupExpiredSessions(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [id, session] of Array.from(this.sessions.entries())) {
            const lastActivity = new Date(session.metadata.lastActivity).getTime();
            if (now - lastActivity > this.config.maxSessionAge) {
                this.deleteSession(id);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * 列出所有会话
     */
    listSessions(): Session[] {
        return Array.from(this.sessions.values())
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    /**
     * 按股票代码查找会话
     */
    findSessionsByStock(stockCode: string): Session[] {
        return this.listSessions().filter(s => s.metadata.stockCode === stockCode);
    }

    /**
     * 保存单个会话
     */
    saveSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        try {
            const filePath = this.getSessionPath(sessionId);
            fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
            this.dirty.delete(sessionId);
            return true;
        } catch (error) {
            console.error(`[SessionStore] Save failed for ${sessionId}:`, error);
            return false;
        }
    }

    /**
     * 保存所有脏会话
     */
    saveAll(): number {
        let saved = 0;
        for (const sessionId of Array.from(this.dirty)) {
            if (this.saveSession(sessionId)) {
                saved++;
            }
        }
        return saved;
    }

    /**
     * 加载所有会话
     */
    private loadAllSessions(): void {
        try {
            const files = fs.readdirSync(this.config.storagePath);

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(this.config.storagePath, file);
                try {
                    const data = fs.readFileSync(filePath, 'utf-8');
                    const session = JSON.parse(data) as Session;
                    this.sessions.set(session.id, session);
                } catch (error) {
                    console.error(`[SessionStore] Load failed for ${file}:`, error);
                }
            }

            console.log(`[SessionStore] Loaded ${this.sessions.size} sessions`);
        } catch (error) {
            console.error('[SessionStore] Load all failed:', error);
        }
    }

    /**
     * 标记会话为脏（需要保存）
     */
    private markDirty(sessionId: string): void {
        this.dirty.add(sessionId);
    }

    /**
     * 生成会话 ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `S-${timestamp}-${random}`;
    }

    /**
     * 导出会话为 Markdown
     */
    exportToMarkdown(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (!session) return '';

        const lines = [
            `# 会话记录`,
            ``,
            `**Session ID**: ${session.id}`,
            `**创建时间**: ${session.createdAt}`,
            `**最后更新**: ${session.updatedAt}`,
            session.metadata.stockCode ? `**股票**: ${session.metadata.stockCode}` : '',
            ``,
            `---`,
            ``,
            `## 对话记录`,
            ``,
        ];

        for (const msg of session.messages) {
            if (msg.role === 'system') continue;

            const roleEmoji = {
                user: '👤',
                assistant: '🤖',
                tool: '🔧',
            }[msg.role] || '📝';

            lines.push(`### ${roleEmoji} ${msg.role.toUpperCase()}`);
            lines.push(``);
            lines.push(msg.content);
            lines.push(``);
        }

        if (session.metadata.taskHistory.length > 0) {
            lines.push(`---`);
            lines.push(``);
            lines.push(`## 任务历史`);
            lines.push(``);
            for (const task of session.metadata.taskHistory) {
                lines.push(`- ${task}`);
            }
        }

        return lines.join('\n');
    }
}

let globalSessionStore: SessionStore | null = null;

export function getSessionStore(): SessionStore {
    if (!globalSessionStore) {
        globalSessionStore = new SessionStore();
    }
    return globalSessionStore;
}
