// [ezo-ui] Pull-to-Refresh — تحديث السحب من الأعلى
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;

interface Props {
  children: React.ReactNode;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export default function PullToRefresh({ children, onRefresh, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        // مقاومة تدريجية
        const resisted = Math.min(MAX_PULL, Math.pow(dy, 0.85) * 0.9);
        setPullDist(resisted);
      } else if (dy <= 0) {
        setPullDist(0);
        startY.current = null;
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const dist = pullDist;
      startY.current = null;

      if (dist >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDist(THRESHOLD);
        const start = Date.now();
        try {
          await onRefresh?.();
        } catch {}
        // على الأقل 500ms دوران
        const elapsed = Date.now() - start;
        if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
        setRefreshing(false);
        setPullDist(0);
      } else {
        setPullDist(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDist, refreshing, onRefresh]);

  const showIndicator = pullDist > 5 || refreshing;
  const rotation = refreshing ? undefined : Math.min(360, pullDist * 3);

  return (
    <div ref={containerRef} className={`relative h-full overflow-y-auto ${className}`}>
      {/* Indicator */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-10"
        style={{
          transform: `translateY(${refreshing ? 20 : Math.max(-50, pullDist - 50)}px)`,
          opacity: showIndicator ? 1 : 0,
          transition: refreshing || pullDist === 0 ? "transform 0.3s ease, opacity 0.2s ease" : "none",
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 shadow-2xl flex items-center justify-center">
          <RefreshCw
            size={16}
            className={`text-white ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
          />
        </div>
      </div>

      {/* Content — يتحرك مع السحب */}
      <div
        style={{
          transform: pullDist > 0 || refreshing
            ? `translateY(${refreshing ? 60 : pullDist}px)`
            : undefined,
          transition: refreshing || pullDist === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
