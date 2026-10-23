import { useEffect, useRef, useState } from "react";
import SVGA from "svgaplayerweb";

interface Props {
  src: string;
  loops?: number;
  className?: string;
  onFinish?: () => void;
  autoPlay?: boolean;
}

export default function SvgaPlayer({ src, loops = 0, className = "", onFinish, autoPlay = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !src) return;
    const canvas = canvasRef.current;
    
    let player: any = null;
    let parser: any = null;

    try {
      player = new (SVGA as any).Player(canvas);
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
            // تعيين الأبعاد الفعلية للكانفاس
            if (videoItem && videoItem.width && videoItem.height) {
              canvas.width = videoItem.width;
              canvas.height = videoItem.height;
            }
            if (autoPlay) player.startAnimation();
          } catch (e: any) { setError(e?.message || "خطأ"); }
        },
        () => { setError("فشل التحميل"); }
      );
    } catch (e: any) { setError("خطأ"); }

    return () => { try { player?.clear(); } catch {} };
  }, [src, loops, autoPlay, onFinish]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className={className} 
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
      />
    </div>
  );
}
