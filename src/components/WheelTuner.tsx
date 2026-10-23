import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Save, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { dialog } from "../lib/dialog";
import imgWheel from "../assets/wheel/wheel.webp";
import imgPointer from "../assets/wheel/pointer.webp";

export default function WheelTuner({ token }: { token: string | null }) {
  // جلب الإعدادات من قاعدة البيانات (إذا كانت موجودة)
  const settings = useQuery(api.assets.list);
  const setAsset = useMutation(api.assets.set);

  const [wheelOffset, setWheelOffset] = useState({ x: 0, y: 0 });
  const [wheelRotate, setWheelRotate] = useState(0);
  const [wheelScale, setWheelScale] = useState(1);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // تحميل الإعدادات المحفوظة
  useEffect(() => {
    if (!settings) return;
    const saved = settings.find((s: any) => s.key === "wheel.tuner.settings");
    if (saved && saved.imageUrl) {
      try {
        const data = JSON.parse(saved.imageUrl);
        setWheelOffset(data.wheelOffset || { x: 0, y: 0 });
        setWheelRotate(data.wheelRotate || 0);
        setWheelScale(data.wheelScale || 1);
        setPointerOffset(data.pointerOffset || { x: 0, y: 0 });
      } catch {}
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = JSON.stringify({ wheelOffset, wheelRotate, wheelScale, pointerOffset });
      await setAsset({
        key: "wheel.tuner.settings",
        imageUrl: data,
        tokenOverride: token ?? undefined,
      });
      dialog.alert("✅ تم حفظ إعدادات العجلة بنجاح");
    } catch (e: any) {
      dialog.alert("❌ فشل الحفظ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWheelOffset({ x: 0, y: 0 });
    setWheelRotate(0);
    setWheelScale(1);
    setPointerOffset({ x: 0, y: 0 });
    dialog.alert("تمت إعادة الضبط");
  };

  // حركة السهم والسحب
  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-lg font-black">🎡 ضبط العجلة</h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-1 rounded bg-red-500/20 text-red-300 text-xs font-bold">
            <RotateCcw size={12} className="inline" /> إعادة
          </button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Save size={12} className="inline" /> حفظ
          </button>
        </div>
      </div>

      {/* منطقة المعاينة */}
      <div className="bg-black/40 rounded-xl p-4 flex flex-col items-center">
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          {/* الصورة */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${wheelOffset.x}px, ${wheelOffset.y}px) rotate(${wheelRotate}deg) scale(${wheelScale})`,
              transformOrigin: "center center",
            }}
          >
            <img src={imgWheel} alt="wheel" className="w-full h-full object-contain" />
          </div>
          {/* السهم */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
            style={{
              transform: `translate(${pointerOffset.x}px, ${pointerOffset.y}px)`,
            }}
          >
            <img src={imgPointer} alt="pointer" className="w-10 h-12 object-contain" />
          </div>
        </div>
      </div>

      {/* أدوات التحكم */}
      <div className="grid grid-cols-2 gap-3">
        {/* تحكم في الصورة */}
        <div className="bg-white/5 p-3 rounded-xl">
          <h3 className="text-white/70 text-xs font-bold mb-2">الصورة</h3>
          <div className="grid grid-cols-3 gap-1 mb-2">
            <div />
            <button onClick={() => setWheelOffset(o => ({...o, y: o.y - 10}))} className="p-2 bg-white/10 rounded"><ChevronUp size={14} className="text-white" /></button>
            <div />
            <button onClick={() => setWheelOffset(o => ({...o, x: o.x - 10}))} className="p-2 bg-white/10 rounded"><ChevronLeft size={14} className="text-white" /></button>
            <div className="p-2 text-white/40 text-xs flex items-center justify-center">↔</div>
            <button onClick={() => setWheelOffset(o => ({...o, x: o.x + 10}))} className="p-2 bg-white/10 rounded"><ChevronRight size={14} className="text-white" /></button>
            <div />
            <button onClick={() => setWheelOffset(o => ({...o, y: o.y + 10}))} className="p-2 bg-white/10 rounded"><ChevronDown size={14} className="text-white" /></button>
            <div />
          </div>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setWheelScale(s => Math.min(s + 0.05, 2))} className="flex-1 p-1 bg-blue-500/20 rounded text-white text-xs"><ZoomIn size={12} className="inline" /></button>
            <button onClick={() => setWheelScale(s => Math.max(s - 0.05, 0.5))} className="flex-1 p-1 bg-blue-500/20 rounded text-white text-xs"><ZoomOut size={12} className="inline" /></button>
            <button onClick={() => setWheelRotate(r => r + 15)} className="flex-1 p-1 bg-purple-500/20 rounded text-white text-xs"><RotateCw size={12} className="inline" /></button>
          </div>
          <div className="text-white/50 text-[10px] text-center">تكبير: {wheelScale.toFixed(2)} | تدوير: {wheelRotate}°</div>
        </div>

        {/* تحكم في السهم */}
        <div className="bg-white/5 p-3 rounded-xl">
          <h3 className="text-white/70 text-xs font-bold mb-2">السهم</h3>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button onClick={() => setPointerOffset(o => ({...o, y: o.y - 5}))} className="p-2 bg-white/10 rounded"><ChevronUp size={14} className="text-white" /></button>
            <div />
            <button onClick={() => setPointerOffset(o => ({...o, x: o.x - 5}))} className="p-2 bg-white/10 rounded"><ChevronLeft size={14} className="text-white" /></button>
            <div className="p-2 text-white/40 text-xs flex items-center justify-center">↔</div>
            <button onClick={() => setPointerOffset(o => ({...o, x: o.x + 5}))} className="p-2 bg-white/10 rounded"><ChevronRight size={14} className="text-white" /></button>
            <div />
            <button onClick={() => setPointerOffset(o => ({...o, y: o.y + 5}))} className="p-2 bg-white/10 rounded"><ChevronDown size={14} className="text-white" /></button>
            <div />
          </div>
        </div>
      </div>

      <div className="text-center text-white/40 text-[10px]">
        * هذه الإعدادات ستُطبق على العجلة في جميع الشاشات عند الضغط على "حفظ".
      </div>
    </div>
  );
}
