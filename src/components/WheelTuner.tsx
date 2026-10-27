import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Save, RotateCcw } from "lucide-react";
import { dialog } from "../lib/dialog";
import imgWheel from "../assets/wheel/wheel.webp";
import imgPointer from "../assets/wheel/pointer.webp";

const SECTORS = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // 9 قطاعات

export default function WheelTuner({ token }: { token: string | null }) {
  const settings = useQuery(api.assets.list);
  const setAsset = useMutation(api.assets.set);

  const [saving, setSaving] = useState(false);
  const [angles, setAngles] = useState<number[]>([0, 40, 80, 120, 160, 200, 240, 280, 320]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0);

  // تحميل الإعدادات المحفوظة
  useEffect(() => {
    if (!settings) return;
    const saved = settings.find((s: any) => s.key === "wheel.tuner.angles");
    if (saved && saved.imageUrl) {
      try {
        const data = JSON.parse(saved.imageUrl);
        if (Array.isArray(data) && data.length === 9) {
          setAngles(data);
        }
      } catch {}
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAsset({
        key: "wheel.tuner.angles",
        imageUrl: JSON.stringify(angles),
        tokenOverride: token ?? undefined,
      });
      dialog.alert("✅ تم حفظ إعدادات العجلة بنجاح");
    } catch (e: any) {
      dialog.alert("❌ فشل الحفظ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateAngle = (index: number, value: number) => {
    const newAngles = [...angles];
    newAngles[index] = value;
    setAngles(newAngles);
  };

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-lg font-black">🎡 ضبط العجلة اليدوي</h2>
        <button onClick={handleSave} disabled={saving} className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
          <Save size={12} className="inline" /> حفظ
        </button>
      </div>

      {/* منطقة المعاينة */}
      <div className="bg-black/40 rounded-xl p-4 flex flex-col items-center">
        <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-500"
            style={{ transform: `rotate(${angles[currentPreviewIndex] || 0}deg)` }}
          >
            <img src={imgWheel} alt="wheel" className="w-full h-full object-contain" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
            <img src={imgPointer} alt="pointer" className="w-8 h-10 object-contain" />
          </div>
        </div>
        <div className="text-white/70 text-xs mt-2">
          معاينة القطاع رقم: {currentPreviewIndex} (اضغط على زر لمشاهدته)
        </div>
      </div>

      {/* أزرار القطاعات */}
      <div className="grid grid-cols-3 gap-2">
        {SECTORS.map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPreviewIndex(idx)}
            className={`py-2 rounded-lg font-bold text-sm ${currentPreviewIndex === idx ? "bg-amber-500 text-black" : "bg-white/10 text-white"}`}
          >
            قطاع {idx}
          </button>
        ))}
      </div>

      {/* محرر الزاوية للقطاع المحدد */}
      <div className="bg-white/5 p-3 rounded-xl space-y-2">
        <div className="text-white/70 text-xs font-bold">
          زاوية القطاع {currentPreviewIndex}:
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={angles[currentPreviewIndex]}
            onChange={(e) => updateAngle(currentPreviewIndex, Number(e.target.value))}
            className="flex-1 bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-white/50 text-xs">درجة</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={angles[currentPreviewIndex]}
          onChange={(e) => updateAngle(currentPreviewIndex, Number(e.target.value))}
          className="w-full accent-amber-400"
        />
      </div>

      <div className="text-center text-white/40 text-[10px]">
        * اختر القطاع الذي تراه، ثم عدل زاويته حتى يتطابق مع الصورة.
      </div>
    </div>
  );
}
