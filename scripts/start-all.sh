#!/bin/bash
# ============================================================
# Stock Tracker 综合启动脚本
# 启动 AKTools + 主服务器
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STOCK_TRACKER_DIR="$(dirname "$SCRIPT_DIR")"  # stock-tracker 目录
PARENT_DIR="$(dirname "$STOCK_TRACKER_DIR")"  # /Users/kckylechen/Desktop/Stock Tracker
PDFENV_DIR="$PARENT_DIR/pdfenv"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AKTools 配置
AKTOOLS_PORT=8098
AKTOOLS_PID_FILE="/tmp/aktools.pid"
AKTOOLS_LOG_FILE="/tmp/aktools.log"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Stock Tracker 启动器${NC}"
echo -e "${BLUE}============================================================${NC}"

# ==================== 函数定义 ====================

check_aktools() {
    if curl -s --connect-timeout 2 "http://127.0.0.1:$AKTOOLS_PORT/version" > /dev/null 2>&1; then
        return 0  # 运行中
    else
        return 1  # 未运行
    fi
}

start_aktools() {
    echo -e "\n${YELLOW}[1/3] 检查 AKTools 服务...${NC}"
    
    if check_aktools; then
        echo -e "${GREEN}  ✓ AKTools 已在端口 $AKTOOLS_PORT 运行${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}  → 启动 AKTools...${NC}"
    
    # 检查 Python 环境
    if [ ! -f "$PDFENV_DIR/bin/python" ]; then
        echo -e "${RED}  ✗ 找不到 Python 虚拟环境: $PDFENV_DIR${NC}"
        echo -e "${RED}    请先创建虚拟环境并安装 aktools${NC}"
        return 1
    fi
    
    # 后台启动 AKTools（使用自定义脚本绕过 CLI 的浏览器问题）
    nohup "$PDFENV_DIR/bin/python" "$STOCK_TRACKER_DIR/scripts/run_aktools.py" $AKTOOLS_PORT > "$AKTOOLS_LOG_FILE" 2>&1 &
    AKTOOLS_PID=$!
    echo $AKTOOLS_PID > "$AKTOOLS_PID_FILE"
    
    # 等待启动
    echo -e "${YELLOW}  → 等待 AKTools 启动...${NC}"
    for i in {1..10}; do
        sleep 1
        if check_aktools; then
            echo -e "${GREEN}  ✓ AKTools 启动成功 (PID: $AKTOOLS_PID, 端口: $AKTOOLS_PORT)${NC}"
            return 0
        fi
        echo -e "  → 等待中... ($i/10)"
    done
    
    echo -e "${RED}  ✗ AKTools 启动超时，请检查日志: $AKTOOLS_LOG_FILE${NC}"
    return 1
}

check_mysql() {
    echo -e "\n${YELLOW}[2/3] 检查 MySQL 服务...${NC}"
    
    if docker ps | grep -q "stock-mysql"; then
        echo -e "${GREEN}  ✓ MySQL 正在运行${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}  → 启动 MySQL...${NC}"
    cd "$STOCK_TRACKER_DIR"
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ MySQL 启动成功${NC}"
        return 0
    else
        echo -e "${RED}  ✗ MySQL 启动失败${NC}"
        return 1
    fi
}

start_main_server() {
    echo -e "\n${YELLOW}[3/3] 启动主服务器...${NC}"
    
    cd "$STOCK_TRACKER_DIR"
    
    echo -e "${GREEN}  → 启动 npm run dev${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    
    # 前台运行主服务器
    npm run dev
}

# ==================== 主流程 ====================

# 启动 AKTools
start_aktools
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}警告: AKTools 启动失败，部分功能可能不可用${NC}"
fi

# 检查 MySQL
check_mysql

# 启动主服务器
start_main_server
