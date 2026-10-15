// [ezo-live-gift] عرض الهدية المتحركة في البث
import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Props {
  streamId: string;
}

interface LiveGiftEvent {
  _id: string;
  giftName: string;
  giftIcon: string;
  fromName: string;
  fromUserId: string;
  toUserId: string;
  price: number;
  quantity: number;
  totalValue: number;
  createdAt: number;
}

export default function LiveGiftAnimation({ streamId }: Props) {
  const sinceRef = useRef<number>(Date.now());
  const [current, setCurrent] = useState<LiveGiftEvent | null>(null);
  const [combo, setCombo] = useState(0);
  const lastGiftRef = useRef<{ id: string; time: number } | null>(null);
  const timeoutRef = useRef<any>(null);

  // Poll for new gifts (كل ثانية)
  const latest = useQuery(api.live.latestGift, {
    streamId: streamId as Id<"liveStreams">,
    since: sinceRef.current,
  });

  useEffect(() => {
    if (!latest) return;

    const now = latest.createdAt;
    sinceRef.current = now;

    // Combo detection: نفس المُرسل خلال 3 ثواني
    const isCombo =
      lastGiftRef.current?.id === latest.fromUserId &&
      now - lastGiftRef.current.time < 3000;

    setCombo(isCombo ? (c) => c + latest.quantity : latest.quantity);
    lastGiftRef.current = { id: latest.fromUserId, time: now };

    setCurrent(latest as any);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
      setCombo(0);
    }, 4000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [latest?._id]);

  if (!current) return null;

  return (
    <div className="absolute inset-0 z-[35] pointer-events-none flex items-center justify-center">
      <div
        key={current._id}
        className="flex flex-col items-center animate-[giftPopUp_4s_ease-out_forwards]"
      >
        {/* Gift icon */}
        <div
          className="w-32 h-32 rounded-3xl bg-black/60 backdrop-blur border-2 border-amber-400/60 flex items-center justify-center shadow-2xl"
          style={{
            boxShadow: "0 0 40px rgba(250, 204, 21, 0.5), 0 0 80px rgba(250, 204, 21, 0.2)",
          }}
        >
          {current.giftIcon ? (
            <img
              src={current.giftIcon}
              alt=""
              className="w-24 h-24 object-contain"
            />
          ) : (
            <span className="text-6xl">🎁</span>
          )}
        </div>

        {/* Combo */}
        {combo > 1 && (
          <div className="mt-2 text-5xl font-black italic tracking-tighter bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(250,204,21,0.8)]">
            ×{combo}
          </div>
        )}

        {/* Sender name */}
        <div className="mt-3 bg-black/80 backdrop-blur rounded-full px-5 py-2 border border-amber-400/40">
          <span className="text-white text-sm font-black">{current.fromName}</span>
          <span className="text-white/60 text-xs mx-2">أرسل</span>
          <span className="text-amber-300 text-sm font-black">{current.giftName}</span>
        </div>
      </div>
    </div>
  );
}
