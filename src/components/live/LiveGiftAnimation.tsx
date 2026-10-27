// [ezo-live-gift] عرض الهدية المتحركة — لكل المشاهدين (TikTok Style)
import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  streamId: string;
}

export default function LiveGiftAnimation({ streamId }: Props) {
  const latest = useQuery(api.live.latestGift, {
    streamId: streamId as Id<"liveStreams">,
  });

  const initializedRef = useRef(false);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [current, setCurrent] = useState<any>(null);
  const [combo, setCombo] = useState(0);
  const lastGiftRef = useRef<{ userId: string; time: number } | null>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (latest !== undefined && !initializedRef.current) {
      setLastSeenId(latest?._id ?? null);
      initializedRef.current = true;
    }
  }, [latest]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!latest) return;
    if (latest._id === lastSeenId) return;

    setLastSeenId(latest._id);

    const now = Date.now();
    const isCombo =
      lastGiftRef.current?.userId === latest.fromUserId &&
      now - lastGiftRef.current.time < 3000;

    setCombo(isCombo ? (c) => c + latest.quantity : latest.quantity);
    lastGiftRef.current = { userId: latest.fromUserId, time: now };

    setCurrent(latest);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
      setCombo(0);
    }, 5000); // 5 ثواني للعرض
  }, [latest?._id]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current._id}
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.4 } }}
          className="absolute inset-0 z-[35] pointer-events-none flex flex-col items-center justify-center overflow-hidden"
        >
          {/* عرض الفيديو أو الصورة بدون أي بطاقة أو خلفية */}
          <div className="relative w-full h-full flex items-center justify-center">
            {current.mediaType === "video" ? (
              <video
                src={current.mediaUrl || current.giftIcon}
                className="w-full h-full object-cover max-h-[80vh] max-w-[90vw] mix-blend-screen"
                autoPlay
                playsInline
                muted={!current.hasSound}
              />
            ) : (
              <img
                src={current.mediaUrl || current.giftIcon}
                alt=""
                className="w-64 h-64 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
              />
            )}
          </div>

          {/* Combo Text */}
          {combo > 1 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-1/4 mt-10 text-6xl font-black italic tracking-tighter bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(250,204,21,0.8)]"
            >
              x{combo}
            </motion.div>
          )}

          {/* Sender Name (Text Shadow without Card) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-10 flex items-center gap-2"
          >
            <span className="text-white text-base font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {current.fromName}
            </span>
            <span className="text-white/80 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              أرسل
            </span>
            <span className="text-amber-300 text-base font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {current.giftName}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
