#!/bin/bash
# AKTools HTTP API 停止脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/aktools.pid"

echo "🛑 停止 AKTools HTTP API..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID"
        rm "$PID_FILE"
        echo "✅ AKTools 已停止 (PID: $PID)"
    else
        echo "⚠️  进程不存在，清理 PID 文件"
        rm "$PID_FILE"
    fi
else
    echo "⚠️  AKTools 未在运行"
fi
