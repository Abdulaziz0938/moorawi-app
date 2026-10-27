$ErrorActionPreference = "Stop"
$root = "C:\projects\moorawi-extract\moorawi-app-main"

Write-Host "=== C-7: capacitor.config.ts ==="
$newCap = @'
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moorawi.app',
  appName: 'Moorawi',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0514',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  server: { androidScheme: 'https' },
};

export default config;
'@
Set-Content "$root\capacitor.config.ts" -Value $newCap -Encoding UTF8
Write-Host "OK: capacitor.config.ts"

Write-Host "=== C-8a: crons.ts ==="
$newCrons = @'
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("presence-sweep", { seconds: 60 }, internal.presence.sweepInactive, {});

crons.interval("live-pk-auto-end", { seconds: 30 }, internal.live.autoEndExpiredPKs, {});

export default crons;
'@
Set-Content "$root\convex\crons.ts" -Value $newCrons -Encoding UTF8
Write-Host "OK: crons.ts"

Write-Host "=== C-8b: presence.ts ==="
$f = "$root\convex\presence.ts"
$c = Get-Content $f -Raw
$c = $c -replace 'const STALE_THRESHOLD_MS = 300_000;', 'const STALE_THRESHOLD_MS = 600_000;'

$oldLeave = @'
      // 2. تفريغ المايك فوراً
      const seats = await ctx.db.query("micSeats")
        .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
        .take(40);
      for (const s of seats) {
        if (s.userId === me._id) {
          await ctx.db.patch("micSeats", s._id, { 
            userId: undefined, muted: false, adminMuted: false, sessionCharms: 0, sessionStartedAt: undefined 
          });
        }
      }
      return { ok: true };
'@
$newLeave = @'
      // 2. تفريغ المايك فوراً
      const seats = await ctx.db.query("micSeats")
        .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
        .take(40);
      for (const s of seats) {
        if (s.userId === me._id) {
          await ctx.db.patch("micSeats", s._id, { 
            userId: undefined, muted: false, adminMuted: false, sessionCharms: 0, sessionStartedAt: undefined 
          });
        }
      }

      const room = await ctx.db.get("rooms", args.roomId);
      if (room && room.currentMusicStartedBy === me._id) {
        await ctx.db.patch("rooms", args.roomId, {
          currentMusicId: undefined,
          currentMusicUrl: undefined,
          currentMusicName: undefined,
          currentMusicStartedBy: undefined,
          currentMusicStartedAt: undefined,
          currentMusicIsPaused: undefined,
          currentMusicPausedAt: undefined,
        });
      }

      return { ok: true };
'@
if ($c.Contains($oldLeave)) {
  $c = $c.Replace($oldLeave, $newLeave)
}
Set-Content $f -Value $c -Encoding UTF8
Write-Host "OK: presence.ts"

Write-Host "=== C-8c: useRoomPresence.ts ==="
$newPresence = @'
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
'@
Set-Content "$root\src\lib\hooks\useRoomPresence.ts" -Value $newPresence -Encoding UTF8
Write-Host "OK: useRoomPresence.ts"

Write-Host "=== C-8d: convex/http.ts ==="
$newHttp = @'
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/leave",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body: any = await request.json();
      if (body && body.roomId && body.tokenOverride) {
        await ctx.runMutation(internal.presence.leave, {
          roomId: body.roomId,
          tokenOverride: body.tokenOverride,
        });
      }
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response("bad request", { status: 400 });
    }
  }),
});

export default http;
'@
Set-Content "$root\convex\http.ts" -Value $newHttp -Encoding UTF8
Write-Host "OK: convex/http.ts"

Write-Host "=== C-9b: MusicPlayer.tsx ==="
$f = "$root\src\components\MusicPlayer.tsx"
$c = Get-Content $f -Raw
$oldM = @'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url, current?.isPaused, variant]);
'@
$newM = @'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url, current?.isPaused, variant]);

  useEffect(() => {
    if (variant !== "hidden") return;
    return () => { stopAudio(); };
  }, [variant]);
'@
if ($c.Contains($oldM)) {
  $c = $c.Replace($oldM, $newM)
}
Set-Content $f -Value $c -Encoding UTF8
Write-Host "OK: MusicPlayer.tsx"

Write-Host "===================================="
Write-Host "  C-7 to C-9 COMPLETE"
Write-Host "===================================="