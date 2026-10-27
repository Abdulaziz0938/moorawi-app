import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const HEARTBEAT_INTERVAL_MS = 25_000;

export function useRoomPresence(roomId: Id<"rooms">, tokenOverride: string) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);
  const intervalRef = useRef<number | null>(null);
  const leftRef = useRef(false);

  useEffect(() => {
    leftRef.current = false;

    const doHeartbeat = () => {
      if (leftRef.current) return;
      heartbeat({ roomId, tokenOverride }).catch(() => {});
    };

    doHeartbeat();
    intervalRef.current = window.setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);

    const handleTerminate = () => {
      if (leftRef.current) return;
      leftRef.current = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);

      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (convexUrl) {
        const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
        const payload = JSON.stringify({ roomId, tokenOverride });
        try {
          navigator.sendBeacon(`${siteUrl}/api/leave`, payload);
        } catch {}
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (document.visibilityState === "visible" && !leftRef.current) {
        doHeartbeat();
        if (!intervalRef.current) {
          intervalRef.current = window.setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
        }
      }
    };

    window.addEventListener("pagehide", handleTerminate);
    window.addEventListener("beforeunload", handleTerminate);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener("pagehide", handleTerminate);
      window.removeEventListener("beforeunload", handleTerminate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roomId, tokenOverride, heartbeat, leave]);

  return { leave };
}
