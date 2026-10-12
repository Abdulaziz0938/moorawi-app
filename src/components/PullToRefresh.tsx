// [ezo-ui] Pull-to-Refresh — تحديث ذكي (فقط من الأعلى فعلاً)
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;
const TOP_THRESHOLD = 2; // نسمح بحد 2px للـ scroll لجبر الأخطاء العشرية

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
  const armed = useRef(false); // هل نحن في وضع "جاهز للسحب"؟

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ============ TOUCH START ============
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) {
        armed.current = false;
        startY.current = null;
        return;
      }
      // هل نحن في أعلى الصفحة تماماً؟
      const atTop = el.scrollTop <= TOP_THRESHOLD;
      armed.current = atTop;
      startY.current = atTop ? e.touches[0].clientY : null;
    };

    // ============ TOUCH MOVE ============
    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current === null) return;

      // ✅ التحقق المستمر: إذا خرجنا من الأعلى → إلغاء
      if (el.scrollTop > TOP_THRESHOLD) {
        armed.current = false;
        startY.current = null;
        setPullDist(0);
        return;
      }

      const dy = e.touches[0].clientY - startY.current;

      if (dy > 0) {
        // نمنع الـ native scroll (passive: false)
        if (e.cancelable) e.preventDefault();
        const resisted = Math.min(MAX_PULL, Math.pow(dy, 0.85) * 0.9);
        setPullDist(resisted);
      } else {
        // المستخدم يمرر لأسفل → ليس pull
        setPullDist(0);
      }
    };

    // ============ TOUCH END ============
    const onTouchEnd = async () => {
      if (!armed.current) {
        setPullDist(0);
        startY.current = null;
        return;
      }
      armed.current = false;
      const dist = pullDist;
      startY.current = null;

      if (dist >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDist(THRESHOLD);
        const start = Date.now();
        try {
          await onRefresh?.();
        } catch {}
        const elapsed = Date.now() - start;
        if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
        setRefreshing(false);
        setPullDist(0);
      } else {
        setPullDist(0);
      }
    };

    // ============ TOUCH CANCEL ============
    const onTouchCancel = () => {
      armed.current = false;
      startY.current = null;
      setPullDist(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    // ⚠️ passive: false — للسماح بـ preventDefault
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [pullDist, refreshing, onRefresh]);

  const showIndicator = pullDist > 5 || refreshing;
  const rotation = refreshing ? undefined : Math.min(360, pullDist * 3);

  return (
    <div
      ref={containerRef}
      className={`relative h-full overflow-y-auto ${className}`}
      style={{
        // ✅ منع pull-to-refresh الأصلي في المتصفح
        overscrollBehaviorY: "contain",
        // ✅ السماح بالـ pan-y فقط (يمنع zoom)
        touchAction: "pan-y",
      }}
    >
      {/* Indicator */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-10"
        style={{
          transform: refreshing
            ? "translateY(20px)"
            : `translateY(${Math.max(-50, pullDist - 50)}px)`,
          opacity: showIndicator ? 1 : 0,
          transition:
            refreshing || pullDist === 0
              ? "transform 0.3s ease, opacity 0.2s ease"
              : "none",
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

      {/* Content */}
      <div
        style={{
          transform:
            pullDist > 0 || refreshing
              ? `translateY(${refreshing ? 60 : pullDist}px)`
              : undefined,
          transition:
            refreshing || pullDist === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
