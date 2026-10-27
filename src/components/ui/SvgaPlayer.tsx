import { useEffect, useRef } from "react";
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
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

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
      if (onFinishRef.current) player.onFinished(() => onFinishRef.current?.());
      parser.load(src, (videoItem: any) => {
        try {
          player.setVideoItem(videoItem);
          if (autoPlay) player.startAnimation();
        } catch (e: any) { console.error("[svga]", e); }
      }, (err: any) => { console.error("[svga] load error:", err); });
    } catch (e: any) { console.error("[svga]", e); }

    return () => { try { player?.clear(); } catch {} };
  }, [src, loops, autoPlay]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
