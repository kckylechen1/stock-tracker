/**
 * 响应式媒体查询 Hook
 * 轻量级实现，无需额外依赖
 */

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // 初始值
    setMatches(media.matches);

    // 监听变化
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// 预定义断点
export function useIsLargeScreen() {
  return useMediaQuery("(min-width: 1280px)");
}

export function useIsMediumScreen() {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsMobileScreen() {
  return useMediaQuery("(max-width: 768px)");
}
