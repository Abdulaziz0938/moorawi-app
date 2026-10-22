import { useEffect, useRef, useState } from "react";
import SVGA from "svgaplayerweb";

interface Props {
  src: string;
  loops?: number;
  className?: string;
  onFinish?: () => void;
  autoPlay?: boolean;
  clearOnStop?: boolean;
}

export default function SvgaPlayer({ src, loops = 0, className = "", onFinish, autoPlay = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;
    const container = containerRef.current;
    container.innerHTML = "";
    
    let player: any = null;
    let parser: any = null;

    try {
      player = new (SVGA as any).Player(container);
      parser = new (SVGA as any).Parser();
      playerRef.current = player;

      player.setContentMode("AspectFit");
      player.setClipsToBounds(false);
      player.loops = loops;
      if (onFinish) player.onFinished(() => onFinish());

      parser.load(
        src,
        (videoItem: any) => {
          try {
            player.setVideoItem(videoItem);
            if (autoPlay) player.startAnimation();
          } catch (e: any) { setError(e?.message || "خطأ في التشغيل"); }
        },
        () => { setError("فشل تحميل SVGA"); }
      );
    } catch (e: any) { setError("خطأ في التهيئة"); }

    return () => { try { player?.clear(); } catch {} };
  }, [src, loops, autoPlay, onFinish]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
      {error && (
        <div className="absolute inset-0 bg-black/50 text-white/50 text-[9px] flex items-center justify-center p-1 text-center rounded">
          ⚠ فشل التحميل
        </div>
      )}
    </div>
  );
}
