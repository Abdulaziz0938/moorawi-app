// [ezo-live-pk] عرض PK — فيديو split + شريط نقاط + timer
import { useEffect, useState } from "react";

interface Props {
  hostName: string;
  hostAvatarUrl?: string;
  hostVipLevel: number;
  hostScore: number;
  coHostName: string;
  coHostAvatarUrl?: string;
  coHostVipLevel: number;
  coHostScore: number;
  pkStartedAt: number;
  pkDurationSec: number;
}

export default function PKView({
  hostName,
  hostAvatarUrl,
  hostVipLevel,
  hostScore,
  coHostName,
  coHostAvatarUrl,
  coHostVipLevel,
  coHostScore,
  pkStartedAt,
  pkDurationSec,
}: Props) {
  const [remaining, setRemaining] = useState(pkDurationSec);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - pkStartedAt) / 1000;
      const left = Math.max(0, pkDurationSec - elapsed);
      setRemaining(Math.floor(left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pkStartedAt, pkDurationSec]);

  const total = hostScore + coHostScore;
  const rawHostPct = total === 0 ? 50 : (hostScore / total) * 100;
  // تثبيت النسبة بين 8% و 92% لمنع اختفاء أي طرف
  const hostPct = total === 0 ? 50 : Math.min(Math.max(rawHostPct, 8), 92);
  const coHostPct = 100 - hostPct;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="absolute top-16 left-0 right-0 z-30 px-3">
      {/* Timer bar */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="bg-black/70 backdrop-blur rounded-full px-4 py-1.5 border border-amber-400/40 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-amber-200 text-xs font-black tabular-nums">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="rounded-2xl bg-black/70 backdrop-blur border border-white/15 overflow-hidden">
        {/* Two avatars at top */}
        <div className="flex items-center justify-between p-2">
          {/* Host */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
              {hostAvatarUrl ? (
                <img src={hostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">
                  {(hostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white text-[11px] font-black truncate max-w-[80px]">
                {hostName}
              </div>
              <div className="text-cyan-300 text-[10px] font-black tabular-nums">
                {hostScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="bg-amber-500/90 rounded-full px-2 py-0.5 flex-shrink-0">
            <span className="text-black text-[9px] font-black">VS</span>
          </div>

          {/* CoHost */}
          <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
              {coHostAvatarUrl ? (
                <img src={coHostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">
                  {(coHostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-white text-[11px] font-black truncate max-w-[80px]">
                {coHostName}
              </div>
              <div className="text-pink-300 text-[10px] font-black tabular-nums">
                {coHostScore.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar — 60fps GPU with clash hit spark */}
        <div className="relative flex h-2.5 overflow-hidden rounded-b-xl bg-black/40">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
            style={{
              width: `${hostPct}%`,
              transition: "width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "width",
              transform: "translateZ(0)",
              boxShadow: "0 0 14px rgba(34,211,238,0.8)",
            }}
          />
          <div
            className="h-full bg-gradient-to-l from-pink-400 via-rose-500 to-purple-600"
            style={{
              width: `${coHostPct}%`,
              transition: "width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "width",
              transform: "translateZ(0)",
              boxShadow: "0 0 14px rgba(244,63,94,0.8)",
            }}
          />

          {/* Clash Spark Indicator (نقطة التماس المضيئة) */}
          <div
            className="absolute top-0 bottom-0 w-1.5 -ml-[3px] bg-white rounded-full pointer-events-none"
            style={{
              left: `${hostPct}%`,
              transition: "left 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: "0 0 8px #ffffff, 0 0 16px rgba(255,255,255,0.9)",
              willChange: "left",
            }}
          />
        </div>
      </div>
    </div>
  );
}
