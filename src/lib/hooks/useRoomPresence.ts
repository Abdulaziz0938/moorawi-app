// [ezo-presence] heartbeat + leave تلقائي — مطابق للمعيار العالمي
//
// آلية العمل:
//   - عند mount: heartbeat فوري (يسجّل lastSeenAt)
//   - كل 25s: heartbeat (يُبقي العضو "نشطاً")
//   - عند إغلاق التاب أو unmount: leave فوري (best-effort)
//   - لو فشل leave: cron sweep يحذف خلال 90s

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const HEARTBEAT_INTERVAL_MS = 25_000;

export function useRoomPresence(
  roomId: Id<"rooms">,
  tokenOverride: string,
) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);
  const intervalRef = useRef<number | null>(null);
  const sentLeaveRef = useRef(false);

  useEffect(() => {
    sentLeaveRef.current = false;

    // 1) heartbeat فوري عند الدخول
    heartbeat({ roomId, tokenOverride }).catch(() => {});

    // 2) heartbeat دوري كل 25s
    intervalRef.current = window.setInterval(() => {
      heartbeat({ roomId, tokenOverride }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    // 3) عند إغلاق التاب → leave فوري
    const handleUnload = () => {
      if (sentLeaveRef.current) return;
      sentLeaveRef.current = true;
      leave({ roomId, tokenOverride }).catch(() => {});
    };

    // 4) عند العودة للتباب → heartbeat فوري
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        heartbeat({ roomId, tokenOverride }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);

      // تنظيف عند unmount
      if (!sentLeaveRef.current) {
        sentLeaveRef.current = true;
        leave({ roomId, tokenOverride }).catch(() => {});
      }
    };
  }, [roomId, tokenOverride, heartbeat, leave]);

  return { leave };
}
