// [ezo-svga] SvgaPlayer — React wrapper for SVGA animations
// Uses "svga" (SVGAPlayer-Web-Lite) — compatible with React 19
import { useEffect, useRef, useState } from "react";
import { Parser, Player } from "svga";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const parserRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !src) return;
    const canvas = canvasRef.current;
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        // Ensure canvas has explicit size
        const parent = canvas.parentElement;
        if (parent && (parent.clientWidth > 0)) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        } else {
          canvas.width = canvas.width || 64;
          canvas.height = canvas.height || 64;
        }

        const parser = new Parser();
        parserRef.current = parser;
        const svgaData = await parser.load(src);
        if (cancelled) return;

        const player = new Player({
          container: canvas,
          loop: loops,
          clearsAfterStop: clearOnStop,
          onEnd: onFinish,
        } as any);
        playerRef.current = player;

        await player.mount(svgaData);
        if (cancelled) return;
        if (autoPlay) player.start();
      } catch (e: any) {
        const msg = e?.message || String(e) || "SVGA failed";
        console.error("[SvgaPlayer]", msg);
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      try { (playerRef.current as any)?.stop?.(); } catch {}
      try { (playerRef.current as any)?.clear?.(); } catch {}
      try { (playerRef.current as any)?.destroy?.(); } catch {}
      try { (parserRef.current as any)?.destroy?.(); } catch {}
    };
  }, [src, loops, autoPlay, clearOnStop, onFinish]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {error && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(220,38,38,0.9)",
          color: "white", fontSize: "7px", padding: "2px", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
        }}>
          ⚠ {error.slice(0, 60)}
        </div>
      )}
    </div>
  );
}
