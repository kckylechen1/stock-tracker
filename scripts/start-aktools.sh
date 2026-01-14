#!/bin/bash
# AKTools HTTP API 启动脚本
# 端口: 8098
#
# 前提条件：
# 1. 安装 Python 3.8+
# 2. 安装 aktools: pip install aktools akshare
#
# 如果使用 virtualenv：
# 1. 创建虚拟环境: python3 -m venv ~/.aktools-env
# 2. 激活并安装: source ~/.aktools-env/bin/activate && pip install aktools akshare

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/aktools.log"
PID_FILE="$PROJECT_ROOT/aktools.pid"
PORT=8098

# 尝试多个 Python 路径
PYTHON_PATHS=(
    "$HOME/.aktools-env/bin/python"           # 推荐：专用虚拟环境
    "/opt/homebrew/bin/python3"                # Homebrew Python (Apple Silicon)
    "/usr/local/bin/python3"                   # Homebrew Python (Intel)
    "/usr/bin/python3"                         # 系统 Python
    "python3"                                  # PATH 中的 python3
)

# 查找可用的 Python
PYTHON_CMD=""
for py in "${PYTHON_PATHS[@]}"; do
    if command -v "$py" > /dev/null 2>&1; then
        # 检查是否安装了 aktools
        if "$py" -c "import aktools" 2>/dev/null; then
            PYTHON_CMD="$py"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ 未找到安装了 aktools 的 Python 环境"
    echo ""
    echo "请按以下步骤设置："
    echo "1. 创建虚拟环境:"
    echo "   python3 -m venv ~/.aktools-env"
    echo ""
    echo "2. 安装依赖:"
    echo "   source ~/.aktools-env/bin/activate"
    echo "   pip install aktools akshare"
    echo ""
    echo "3. 重新运行此脚本"
    exit 1
fi

echo "🚀 启动 AKTools HTTP API..."
echo "   Python: $PYTHON_CMD"
echo "   端口: $PORT"
echo "   日志: $LOG_FILE"

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  AKTools 已在运行 (PID: $OLD_PID)"
        echo "   如需重启，请先运行: pnpm stop:aktools"
        exit 1
    fi
fi

# 清空旧日志
> "$LOG_FILE"

# 启动 AKTools
cd "$PROJECT_ROOT" || exit 1
nohup "$PYTHON_CMD" -m aktools -P $PORT >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

# 等待启动
echo "   等待服务启动..."
sleep 3

# 检查是否启动成功
if curl -s "http://127.0.0.1:$PORT/version" > /dev/null 2>&1; then
    echo "✅ AKTools 启动成功!"
    echo "   PID: $NEW_PID"
    echo "   主页: http://127.0.0.1:$PORT/"
    echo "   API文档: http://127.0.0.1:$PORT/docs"
    curl -s "http://127.0.0.1:$PORT/version" | head -1
else
    echo "❌ AKTools 启动失败，日志内容:"
    echo "----------------------------------------"
    cat "$LOG_FILE"
    echo "----------------------------------------"
    echo ""
    echo "常见问题排查："
    echo "1. 确保已安装 aktools: pip install aktools akshare"
    echo "2. 确保端口 $PORT 未被占用: lsof -i :$PORT"
fi
