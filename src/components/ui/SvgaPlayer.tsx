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
  const [loading, setLoading] = useState(true);

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
            if (videoItem && videoItem.width && videoItem.height) {
              canvas.width = videoItem.width;
              canvas.height = videoItem.height;
            }
            if (autoPlay) player.startAnimation();
            setLoading(false);
          } catch (e: any) { setError(e?.message || "خطأ في التشغيل"); setLoading(false); }
        },
        () => { setError("فشل تحميل الملف (تأكد من الرابط)"); setLoading(false); }
      );
    } catch (e: any) { setError("خطأ في المشغل"); setLoading(false); }

    return () => { try { player?.clear(); } catch {} };
  }, [src, loops, autoPlay, onFinish]);

  return (
    <div className="w-full h-full flex items-center justify-center relative bg-black/50">
      <canvas
        ref={canvasRef}
        className={className}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
      {loading && <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold bg-black/60">جاري التحميل...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-red-600 text-white p-4 text-center font-bold">{error}</div>}
    </div>
  );
}
