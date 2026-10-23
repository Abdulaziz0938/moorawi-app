import { useEffect, useRef, useState } from "react";
// @ts-ignore
import { Player, Parser } from "svgaplayerweb";

interface Props {
  src: string;
  loops?: number;
  className?: string;
  onFinish?: () => void;
  autoPlay?: boolean;
}

export default function SvgaPlayer({ src, loops = 0, className = "", onFinish, autoPlay = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !src) return;
    const canvas = canvasRef.current;
    
    let player: any = null;
    let parser: any = null;

    try {
      player = new Player(canvas);
      parser = new Parser();
      
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
          } catch (e: any) {
            setError("خطأ في التشغيل");
          }
        },
        (err: any) => { 
          setError("فشل تحميل الملف"); 
        }
      );
    } catch (e: any) {
      setError("خطأ في المشغل");
    }

    return () => {
      try { player?.clear(); } catch {}
    };
  }, [src, loops, autoPlay, onFinish]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-red-500 font-bold text-sm bg-white p-2 rounded">{error}</span>
      </div>
    );
  }

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
