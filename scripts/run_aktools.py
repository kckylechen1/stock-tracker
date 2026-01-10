#!/usr/bin/env python3
"""
直接启动 AKTools HTTP 服务（绕过 CLI 中的浏览器打开问题）
"""
import sys
import os

import uvicorn
from aktools.main import app

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8098
    print(f"启动 AKTools HTTP API 在端口 {port}")
    print(f"访问: http://127.0.0.1:{port}/docs")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
