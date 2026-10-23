import { useEffect, useRef, useState } from "react";

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<any>(null);
  const [debugMsg, setDebugMsg] = useState("⏳ جاري تحميل الأنيميشن...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPagLib = async () => {
      if ((window as any).libpag) return (window as any).libpag;
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/libpag@4.4.14/lib/libpag.min.js";
        script.onload = () => resolve((window as any).libpag);
        script.onerror = () => reject("فشل تحميل مكتبة PAG من الإنترنت");
        document.body.appendChild(script);
      });
    };

    (async () => {
      try {
        setDebugMsg("⏳ جاري تحميل المكتبة...");
        const PAG = await loadPagLib();
        if (!isMounted || !canvasRef.current) return;

        setDebugMsg("⏳ جاري تحميل ملف الأنيميشن...");
        const pagFile = await PAG.PAGFile.load(src);
        const canvas = canvasRef.current;
        
        canvas.width = pagFile.width();
        canvas.height = pagFile.height();

        setDebugMsg(`✅ تم التحميل! الأبعاد: ${pagFile.width()}x${pagFile.height()}`);

        pagViewRef.current = await PAG.PAGView.init(pagFile, canvas);
        if (!isMounted) return;
        
        pagViewRef.current.setRepeatCount(1); 
        pagViewRef.current.play();
      } catch (e: any) {
        console.error("[PAG] load error:", e);
        if (isMounted) {
          setIsError(true);
          setDebugMsg(`❌ خطأ: ${e?.message || e || "المكتبة فشلت بالتحميل"}`);
        }
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
    <div className={`relative flex items-center justify-center w-full h-full ${className}`}>
      {/* رسالة الفحص - بتظهر فوق الكانفس */}
      <div style={{
        position: 'absolute', top: 20, left: 10, right: 10, zIndex: 99999,
        background: isError ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)',
        color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center',
        fontWeight: 'bold', fontSize: '14px', direction: 'rtl'
      }}>
        {debugMsg}
      </div>

      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}
