import { useEffect, useRef } from "react";

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPagLib = async () => {
      if ((window as any).libpag) return (window as any).libpag;
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        // القراءة من ملفات سيرفرك المباشرة
        script.src = "/libpag.min.js"; 
        script.onload = () => resolve((window as any).libpag);
        script.onerror = () => reject("فشل تحميل مكتبة PAG المحلية");
        document.body.appendChild(script);
      });
    };

    (async () => {
      try {
        const PAG = await loadPagLib();
        if (!isMounted || !canvasRef.current) return;

        const pagFile = await PAG.PAGFile.load(src);
        const canvas = canvasRef.current;
        
        // ضبط أبعاد الكانفس
        canvas.width = pagFile.width();
        canvas.height = pagFile.height();

        pagViewRef.current = await PAG.PAGView.init(pagFile, canvas);
        if (!isMounted) return;
        
        pagViewRef.current.setRepeatCount(1); // يشتغل مرة وحدة
        pagViewRef.current.play();
      } catch (e) {
        // كتمنا الخطأ عشان ما يطلع المربع الأحمر بالبروفايل
        console.warn("[PAG] load error:", e); 
      }
    })();

    return () => {
      isMounted = false;
      if (pagViewRef.current) {
        pagViewRef.current.destroy();
        pagViewRef.current = null;
      }
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        background: "transparent",
      }}
    />
  );
}
