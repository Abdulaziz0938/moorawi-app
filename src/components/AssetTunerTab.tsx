// [ezo-tuner] تبويب ضبط يدوي — معاينة مباشرة للميني والبروفايل
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, useAssetsFull } from "../lib/assets";
import { getActiveToken } from "../lib/session";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";

const VIP_LEVELS = [1, 2, 3, 4, 5, 6, 7];

type Slot = {
  key: string;
  label: string;
  preview: "top" | "card" | "bg" | "avatar" | "all";
};

const SLOTS: Slot[] = [
  { key: "background", label: "الخلفية", preview: "bg" },
  { key: "card",       label: "البطاقة", preview: "card" },
  { key: "top",        label: "القمة",   preview: "top" },
  { key: "frame",      label: "الإطار",  preview: "avatar" },
  { key: "halo",       label: "الهالة",  preview: "avatar" },
  { key: "logo",       label: "الشعار",  preview: "all" },
];

function Slider({
  label, value, setValue, min, max, unit = "",
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[9px] text-white/70 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MiniProfile Preview — مطابق للشكل الحقيقي
// ═══════════════════════════════════════════════════════
function MiniProfilePreview({
  level, assets, assetsFull,
}: {
  level: number;
  assets: Record<string, string>;
  assetsFull: Record<string, any>;
}) {
  const card = assets[`vip.card.${level}`];
  const top = assets[`vip.top.${level}`];
  const bg = assets[`vip.background.${level}`];
  const frame = assets[`vip.frame.${level}`];
  const topFull = assetsFull[`vip.top.${level}`];
  const cardFull = assetsFull[`vip.card.${level}`];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] text-white/50 font-black">MiniProfile</div>
      <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden border border-white/20 bg-black">
        {/* VIP background */}
        {bg && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
          />
        )}
        {/* Sheet starts at 20% height */}
        <div className="absolute left-0 right-0 top-[20%] bottom-0">
          {/* Card as background */}
          {card && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${card})`,
                backgroundSize: "100% 100%",
                opacity: 0.4,
              }}
            />
          )}
          {/* Dark */}
          <div className="absolute inset-0 bg-black/55" />
          {/* Card frame */}
          {card && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderImageSource: `url(${card})`,
                borderImageSlice: "80",
                borderImageRepeat: "stretch",
                borderImageWidth: "15px",
                borderStyle: "solid",
              }}
            />
          )}
          {/* Top ornament */}
          {top && (
            <div
              className="absolute left-0 right-0 flex justify-center pointer-events-none"
              style={{
                top: 0,
                transform: `translateY(${topFull?.offsetY ?? -70}px)`,
              }}
            >
              <img
                src={top}
                alt=""
                style={{
                  width: `${topFull?.canvasSize ?? 100}%`,
                  transform: `scale(${(topFull?.holeSize ?? 100) / 100})`,
                  transformOrigin: "center top",
                }}
              />
            </div>
          )}
          {/* Avatar mockup */}
          <div className="absolute -top-4 right-3 z-30">
            <div className="w-10 h-10 rounded-full bg-purple-600 border border-white/30 overflow-hidden relative">
              {frame && (
                <img
                  src={frame}
                  alt=""
                  className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] object-contain pointer-events-none"
                />
              )}
            </div>
          </div>
          {/* Content mockup */}
          <div className="relative z-20 pt-7 px-3 text-white text-[7px] space-y-0.5">
            <div className="font-black">Super Admin</div>
            <div className="opacity-70">ID: 1 · 26 سنة</div>
            <div className="opacity-50">SY · ذكر</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ProfilePage Preview
// ═══════════════════════════════════════════════════════
function ProfilePreview({
  level, assets, assetsFull,
}: {
  level: number;
  assets: Record<string, string>;
  assetsFull: Record<string, any>;
}) {
  const top = assets[`vip.top.${level}`];
  const bg = assets[`vip.background.${level}`];
  const frame = assets[`vip.frame.${level}`];
  const topFull = assetsFull[`vip.top.${level}`];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] text-white/50 font-black">Profile</div>
      <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden border border-white/20 bg-black">
        {bg && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/55" />
        {/* Cover (top 25%) */}
        <div className="absolute top-0 left-0 right-0 h-[25%] bg-gradient-to-b from-purple-900/50 to-black/70" />
        {/* Top ornament at divider */}
        {top && (
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
            style={{
              top: "25%",
              transform: `translateY(${topFull?.offsetY ?? -55}px)`,
            }}
          >
            <img
              src={top}
              alt=""
              style={{
                width: `${topFull?.canvasSize ?? 100}%`,
                transform: `scale(${(topFull?.holeSize ?? 100) / 100})`,
                transformOrigin: "center top",
              }}
            />
          </div>
        )}
        {/* Avatar */}
        <div className="absolute right-3 z-30" style={{ top: "calc(25% - 20px)" }}>
          <div className="w-10 h-10 rounded-full bg-purple-600 border border-white/30 overflow-hidden relative">
            {frame && (
              <img
                src={frame}
                alt=""
                className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] object-contain pointer-events-none"
              />
            )}
          </div>
        </div>
        {/* Content */}
        <div className="absolute inset-x-0 top-[30%] p-2 text-white text-[7px] space-y-1 z-20">
          <div className="text-right font-black">Super Admin</div>
          <div className="text-right opacity-70 text-[6px]">ID:1</div>
          <div className="flex justify-between pt-2">
            <div><div className="font-black">0</div><div className="opacity-60 text-[5px]">زوار</div></div>
            <div><div className="font-black">0</div><div className="opacity-60 text-[5px]">معجبين</div></div>
            <div><div className="font-black">0</div><div className="opacity-60 text-[5px]">متابعين</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetTunerTab() {
  const [level, setLevel] = useState(4);
  const [slot, setSlot] = useState("top");
  const [width, setWidth] = useState(100);
  const [yOff, setYOff] = useState(-70);
  const [xOff, setXOff] = useState(0);
  const [scale, setScale] = useState(100);
  const [saving, setSaving] = useState(false);

  const assets = useAssets();
  const assetsFull = useAssetsFull();
  const setAsset = useMutation(api.assets.set);

  const key = `vip.${slot}.${level}`;
  const full = assetsFull[key];
  const hasImage = !!assets[key];

  // Sync when level/slot changes
  useEffect(() => {
    setWidth(full?.canvasSize ?? 100);
    setYOff(full?.offsetY ?? (slot === "top" ? -70 : 0));
    setXOff(full?.offsetX ?? 0);
    setScale(full?.holeSize ?? 100);
  }, [level, slot, full?.canvasSize, full?.offsetY, full?.offsetX, full?.holeSize]);

  const save = async () => {
    if (!hasImage) {
      dialog.alert("ارفع الصورة أولاً في تبويب VIP");
      return;
    }
    setSaving(true);
    try {
      await setAsset({
        key,
        imageUrl: assets[key],
        canvasSize: width,
        offsetY: yOff,
        offsetX: xOff,
        holeSize: scale,
        tokenOverride: getActiveToken() ?? getDeviceId(),
      });
      dialog.alert("✅ تم الحفظ");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-8" dir="rtl">
      {/* VIP level selector */}
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {VIP_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`flex-shrink-0 px-3 py-1 rounded-full border text-[11px] font-black ${
              l === level
                ? "bg-amber-500 text-black border-amber-400"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            VIP {l}
          </button>
        ))}
      </div>

      {/* Dual previews */}
      <div className="grid grid-cols-2 gap-2">
        <MiniProfilePreview level={level} assets={assets} assetsFull={assetsFull} />
        <ProfilePreview level={level} assets={assets} assetsFull={assetsFull} />
      </div>

      {/* Slot selector */}
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {SLOTS.map((s) => {
          const hasImg = !!assets[`vip.${s.key}.${level}`];
          return (
            <button
              key={s.key}
              onClick={() => setSlot(s.key)}
              className={`flex-shrink-0 px-3 py-1 rounded-full border text-[10px] font-black relative ${
                s.key === slot
                  ? "bg-purple-500/40 border-purple-400 text-white"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              {s.label}
              {!hasImg && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-2">
        <div className="text-amber-300 text-[10px] font-black mb-1">
          🎛️ ضبط — {SLOTS.find((s) => s.key === slot)?.label} (VIP {level})
          {!hasImage && <span className="text-red-400 mr-2">— ارفع الصورة أولاً</span>}
        </div>

        <Slider label="العرض %" value={width} setValue={setWidth} min={0} max={200} unit="%" />
        <Slider label="Y (سالب = أعلى)" value={yOff} setValue={setYOff} min={-300} max={200} unit="px" />
        <Slider label="X (سالب = يسار)" value={xOff} setValue={setXOff} min={-200} max={200} unit="px" />
        <Slider label="الحجم %" value={scale} setValue={setScale} min={0} max={300} unit="%" />

        <button
          onClick={save}
          disabled={saving || !hasImage}
          className="w-full py-2 rounded-lg bg-amber-500 text-black font-black text-xs active:scale-95 disabled:opacity-40 mt-2"
        >
          {saving ? "..." : "حفظ الضبط"}
        </button>
      </div>

      {/* Info */}
      <div className="text-[9px] text-white/40 text-center">
        المعاينتان تتحدثان تلقائياً عند حفظ القيم
      </div>
    </div>
  );
}
