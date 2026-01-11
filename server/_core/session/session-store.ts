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

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type TodoRunStatus = 'running' | 'completed' | 'failed';

export interface TodoItem {
    id: string;
    title: string;
    status: TodoStatus;
    createdAt: string;
    updatedAt: string;
    toolCallId?: string;
    toolName?: string;
    toolArgs?: Record<string, any>;
    resultPreview?: string;
    error?: string;
}

export interface TodoRun {
    id: string;
    userMessage: string;
    stockCode?: string;
    thinkHard: boolean;
    createdAt: string;
    updatedAt: string;
    status: TodoRunStatus;
    todos: TodoItem[];
}

export interface SessionMetadata {
    stockCode?: string;
    taskHistory: string[];
    tokenUsage: number;
    lastActivity: string;
    detailMode?: boolean; // 是否启用详细输出模式
    todoRuns?: TodoRun[];
    activeTodoRunId?: string;
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
                todoRuns: [],
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
     * 开始一次 TODO Run（一次用户请求对应一次 Run）
     */
    startTodoRun(sessionId: string, params: {
        userMessage: string;
        stockCode?: string;
        thinkHard?: boolean;
        initialTodos?: Array<Pick<TodoItem, 'title'> & Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>>>;
    }): TodoRun {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        const now = new Date().toISOString();
        const run: TodoRun = {
            id: this.generateTodoRunId(),
            userMessage: params.userMessage,
            stockCode: params.stockCode,
            thinkHard: Boolean(params.thinkHard),
            createdAt: now,
            updatedAt: now,
            status: 'running',
            todos: [],
        };

        const initialTodos = params.initialTodos || [];
        for (const todo of initialTodos) {
            run.todos.push({
                id: this.generateTodoId(),
                title: todo.title,
                status: todo.status || 'pending',
                createdAt: now,
                updatedAt: now,
                toolCallId: todo.toolCallId,
                toolName: todo.toolName,
                toolArgs: todo.toolArgs,
                resultPreview: todo.resultPreview,
                error: todo.error,
            });
        }

        if (!session.metadata.todoRuns) {
            session.metadata.todoRuns = [];
        }
        session.metadata.todoRuns.push(run);
        session.metadata.todoRuns = session.metadata.todoRuns.slice(-20);
        session.metadata.activeTodoRunId = run.id;

        this.markDirty(sessionId);
        if (this.config.autoSave) {
            this.saveSession(sessionId);
        }

        return run;
    }

    getTodoRuns(sessionId: string): TodoRun[] {
        const session = this.sessions.get(sessionId);
        return session?.metadata.todoRuns ? [...session.metadata.todoRuns] : [];
    }

    getActiveTodoRun(sessionId: string): TodoRun | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const runId = session.metadata.activeTodoRunId;
        if (!runId || !session.metadata.todoRuns) return null;

        return session.metadata.todoRuns.find(r => r.id === runId) || null;
    }

    /**
     * 根据 tool_call_id 添加/更新 TODO
     */
    upsertTodoForToolCall(sessionId: string, runId: string, params: {
        toolCallId: string;
        toolName: string;
        toolArgs?: Record<string, any>;
        status?: TodoStatus;
        title?: string;
    }): TodoItem {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const run = (session.metadata.todoRuns || []).find(r => r.id === runId);
        if (!run) {
            throw new Error(`Todo run not found: ${runId}`);
        }

        const now = new Date().toISOString();
        const existing = run.todos.find(t => t.toolCallId === params.toolCallId);
        if (existing) {
            existing.updatedAt = now;
            existing.status = params.status || existing.status;
            existing.toolName = params.toolName || existing.toolName;
            existing.toolArgs = params.toolArgs || existing.toolArgs;
            existing.title = params.title || existing.title;
            run.updatedAt = now;

            this.markDirty(sessionId);
            if (this.config.autoSave) this.saveSession(sessionId);
            return existing;
        }

        const item: TodoItem = {
            id: this.generateTodoId(),
            title: params.title || params.toolName,
            status: params.status || 'pending',
            createdAt: now,
            updatedAt: now,
            toolCallId: params.toolCallId,
            toolName: params.toolName,
            toolArgs: params.toolArgs,
        };
        run.todos.push(item);
        run.updatedAt = now;

        this.markDirty(sessionId);
        if (this.config.autoSave) this.saveSession(sessionId);
        return item;
    }

    updateTodo(sessionId: string, runId: string, todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const run = (session.metadata.todoRuns || []).find(r => r.id === runId);
        if (!run) return;

        const todo = run.todos.find(t => t.id === todoId);
        if (!todo) return;

        Object.assign(todo, updates);
        todo.updatedAt = new Date().toISOString();
        run.updatedAt = todo.updatedAt;

        this.markDirty(sessionId);
        if (this.config.autoSave) {
            this.saveSession(sessionId);
        }
    }

    finishTodoRun(sessionId: string, runId: string, status: TodoRunStatus): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const run = (session.metadata.todoRuns || []).find(r => r.id === runId);
        if (!run) return;

        run.status = status;
        run.updatedAt = new Date().toISOString();

        if (session.metadata.activeTodoRunId === runId) {
            session.metadata.activeTodoRunId = undefined;
        }

        this.markDirty(sessionId);
        if (this.config.autoSave) {
            this.saveSession(sessionId);
        }
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

    private generateTodoRunId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `R-${timestamp}-${random}`;
    }

    private generateTodoId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `T-${timestamp}-${random}`;
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

        if (session.metadata.todoRuns && session.metadata.todoRuns.length > 0) {
            const latest = session.metadata.todoRuns[session.metadata.todoRuns.length - 1];
            lines.push(``);
            lines.push(`---`);
            lines.push(``);
            lines.push(`## 最近一次 TODO`);
            lines.push(``);
            lines.push(`- Run ID: ${latest.id}`);
            lines.push(`- 状态: ${latest.status}`);
            lines.push(`- ThinkHard: ${latest.thinkHard ? 'true' : 'false'}`);
            lines.push(``);
            for (const todo of latest.todos) {
                const status = {
                    pending: '⏳',
                    in_progress: '🚧',
                    completed: '✅',
                    failed: '❌',
                    skipped: '⏭️',
                }[todo.status] || '📝';
                lines.push(`- ${status} ${todo.title}`);
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
