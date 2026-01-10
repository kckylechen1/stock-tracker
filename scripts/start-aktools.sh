#!/bin/bash
# AKTools HTTP API 启动脚本
# 端口: 8098

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STOCK_TRACKER_ROOT="/Users/kckylechen/Desktop/Stock Tracker"
PYVENV_PATH="$STOCK_TRACKER_ROOT/pdfenv"
LOG_FILE="$PROJECT_ROOT/aktools.log"
PID_FILE="$PROJECT_ROOT/aktools.pid"
PORT=8098

echo "🚀 启动 AKTools HTTP API..."
echo "   端口: $PORT"
echo "   日志: $LOG_FILE"

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  AKTools 已在运行 (PID: $OLD_PID)"
        echo "   如需重启，请先运行: ./scripts/stop-aktools.sh"
        exit 1
    fi
fi

# 启动 AKTools
cd "$STOCK_TRACKER_ROOT" || exit 1
nohup "$PYVENV_PATH/bin/python" -m aktools -P $PORT >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

# 等待启动
sleep 3

# 检查是否启动成功
if curl -s "http://127.0.0.1:$PORT/version" > /dev/null 2>&1; then
    echo "✅ AKTools 启动成功!"
    echo "   PID: $NEW_PID"
    echo "   主页: http://127.0.0.1:$PORT/"
    echo "   API文档: http://127.0.0.1:$PORT/docs"
    curl -s "http://127.0.0.1:$PORT/version" | head -1
else
    echo "❌ AKTools 启动失败，请查看日志:"
    echo "   tail -f $LOG_FILE"
    cat "$LOG_FILE"
fi
