import { useEffect, useRef } from "react";
import { PAGInit } from "libpag";

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let pagView: any = null;
    let isMounted = true;

    (async () => {
      try {
        const PAG = await PAGInit();
        if (!isMounted || !canvasRef.current) return;
        
        const pagFile = await PAG.PAGFile.load(src);
        pagView = await PAG.PAGView.init(pagFile, canvasRef.current);
        
        if (!isMounted) return;
        pagView.setRepeatCount(0); // 0 تعني تكرار بلا توقف
        pagView.play();
      } catch (e) {
        console.error("PAG load error", e);
      }
    })();

    return () => {
      isMounted = false;
      if (pagView) pagView.destroy();
    };
  }, [src]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
}
