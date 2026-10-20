// [ezo-gifts-pro] Imperative wave spawner — Yalla/Binmo style
// كل هدية تُضاف كـ DOM node مباشر — لا React re-render — سلس لـ آلاف الهدايا
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface FlyingTarget {
  userId: string;
  targetX: number;
  targetY: number;
  spreadX: number;
  spreadY: number;
  isOnMic: boolean;
  seatIndex?: number;
  delay?: number;
}

export type GiftWavesHandle = {
  spawn: (gift: { mediaUrl: string | null }, particles: FlyingTarget[]) => void;
};

const GiftWavesLayer = forwardRef<GiftWavesHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      spawn(gift, particles) {
        const container = containerRef.current;
        if (!container || !gift.mediaUrl || !particles.length) return;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // [ezo-pro] إنشاء DOM node مباشر — بدون state
          const el = document.createElement("div");
          el.className = "fixed pointer-events-none multi-gift-particle";
          el.style.left = "50%";
          el.style.top = "50%";
          el.style.animationDelay = `${p.delay ?? 0}ms`;
          el.style.setProperty("--spread-x", `${p.spreadX}px`);
          el.style.setProperty("--spread-y", `${p.spreadY}px`);
          el.style.setProperty("--target-x", `${p.targetX}px`);
          el.style.setProperty("--target-y", `${p.targetY}px`);

          const img = document.createElement("img");
          img.src = gift.mediaUrl;
          img.alt = "";
          img.draggable = false;
          img.className = p.isOnMic
            ? "w-24 h-24 object-contain drop-shadow-2xl"
            : "w-16 h-16 object-contain drop-shadow-2xl";
          el.appendChild(img);

          container.appendChild(el);

          // احذفه بعد انتهاء الأنيميشن (2.2s + 300ms buffer)
          const cleanupDelay = 2200 + (p.delay ?? 0) + 300;
          window.setTimeout(() => {
            el.remove();
          }, cleanupDelay);
        }
      },
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[74] pointer-events-none gift-waves-layer"
    />
  );
});

GiftWavesLayer.displayName = "GiftWavesLayer";

export default GiftWavesLayer;
