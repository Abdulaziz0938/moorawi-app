import { useEffect, useRef } from "react";

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let pagView: any = null;
    let isMounted = true;

    const loadPag = async () => {
      if ((window as any).libpag) return (window as any).libpag;
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/libpag@4.4.14/lib/libpag.min.js";
        script.onload = () => resolve((window as any).libpag);
        document.body.appendChild(script);
      });
    };

    (async () => {
      try {
        const PAG = await loadPag();
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
