import { useEffect, useRef } from "react";
import { PAGInit } from "libpag";

let pagPromise: Promise<any> | null = null;
function getPAG() {
  if (!pagPromise) {
    pagPromise = PAGInit({ locateFile: (f: string) => `/pag/${f}` });
  }
  return pagPromise;
}

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const PAG = await getPAG();
        const pagFile = await PAG.PAGFile.load(src);
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = pagFile.width();
        canvas.height = pagFile.height();

        const view = await PAG.PAGView.init(pagFile, canvas);
        if (!isMounted) { try { view.destroy(); } catch {} return; }
        pagViewRef.current = view;
        view.setRepeatCount(1);
        view.play();
      } catch (e: any) {
        console.error("[PAG] load error:", e);
      }
    })();

    return () => {
      isMounted = false;
      try { pagViewRef.current?.destroy(); } catch {}
      pagViewRef.current = null;
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent" }}
    />
  );
}
