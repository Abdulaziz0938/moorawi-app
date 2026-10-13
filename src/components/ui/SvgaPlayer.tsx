// [ezo-svga] SvgaPlayer — React wrapper for SVGA animations
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

export default function SvgaPlayer({
  src,
  loops = 0,
  className = "",
  onFinish,
  autoPlay = true,
  clearOnStop = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;
    const container = containerRef.current;

    // نُنظف أي أطفال سابقين
    container.innerHTML = "";

    let player: any = null;
    let parser: any = null;

    try {
      player = new SVGA.Player(container);
      parser = new SVGA.Parser();
      playerRef.current = player;

      player.setContentMode("AspectFit");
      player.setClipsToBounds(false);
      player.setLoops(loops);
      if (autoPlay) player.startAnimation();
      if (onFinish) player.onFinished(() => onFinish());

      parser.load(
        src,
        (videoItem: any) => {
          try {
            player.setVideoItem(videoItem);
            player.startAnimation();
          } catch (e: any) {
            setError(e?.message || "SVGA play error");
          }
        },
        (err: any) => {
          setError("تعذّر تحميل SVGA");
        }
      );
    } catch (e: any) {
      setError(e?.message || "SVGA init error");
    }

    return () => {
      try {
        if (player) {
          player.stopAnimation();
          if (clearOnStop) player.clear();
        }
      } catch {}
      playerRef.current = null;
    };
  }, [src, loops, autoPlay, onFinish, clearOnStop]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-white/40 text-[10px]">{error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
