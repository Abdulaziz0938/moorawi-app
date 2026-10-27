// [ezo-tuner] تبويب ضبط — قسمان منفصلان (Mini + Profile)
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, useAssetsFull } from "../lib/assets";
import { getActiveToken } from "../lib/session";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";

const VIP_LEVELS = [1, 2, 3, 4, 5, 6, 7];

// ═══════════════════════════════════════════════════════════
// Slider
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// MiniProfile Preview — الـ slot: vip.top.N
// ═══════════════════════════════════════════════════════════
function MiniPreview({ level, assets, assetsFull }: {
  level: number;
  assets: Record<string, string>;
  assetsFull: Record<string, any>;
}) {
  const top = assets[`vip.top.${level}`];
  const topFull = assetsFull[`vip.top.${level}`];
  const card = assets[`vip.card.${level}`];

  return (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden border border-purple-400/40 bg-black">
      {/* Card as bg */}
      {card && (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${card})`,
            backgroundSize: "100% 100%",
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
      {/* Card frame */}
      {card && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderImageSource: `url(${card})`,
            borderImageSlice: "80",
            borderImageRepeat: "stretch",
            borderImageWidth: "12px",
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
            transform: `translateY(${topFull?.offsetY ?? -70}px) translateX(${topFull?.offsetX ?? 0}px)`,
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
            draggable={false}
          />
        </div>
      )}
      {/* Avatar mockup */}
      <div className="absolute -top-3 right-3 z-30">
        <div className="w-8 h-8 rounded-full bg-purple-600 border border-white/30" />
      </div>
      {/* Content mockup */}
      <div className="relative z-20 pt-6 px-2 text-white text-[6px] space-y-0.5">
        <div className="font-black">Super Admin</div>
        <div className="opacity-70 text-[5px]">ID: 1 · 26 سنة</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Profile Preview — الـ slot: vip.top.full.N
// ═══════════════════════════════════════════════════════════
function ProfilePreview({ level, assets, assetsFull }: {
  level: number;
  assets: Record<string, string>;
  assetsFull: Record<string, any>;
}) {
  const top = assets[`vip.top.full.${level}`] ?? assets[`vip.top.${level}`];
  const topFull = assetsFull[`vip.top.full.${level}`] ?? assetsFull[`vip.top.${level}`];
  const bg = assets[`vip.background.${level}`];

  return (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden border border-emerald-400/40 bg-black">
      {bg && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${bg})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/50" />
      {/* Cover 25% */}
      <div className="absolute top-0 left-0 right-0 h-[25%] bg-gradient-to-b from-purple-900/60 to-black/70" />
      {/* Divider line */}
      <div className="absolute left-0 right-0 top-[25%] h-[2px] bg-white/30" />
      {/* Top ornament at divider */}
      {top && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
          style={{
            top: "25%",
            transform: `translateY(${topFull?.offsetY ?? -55}px) translateX(${topFull?.offsetX ?? 0}px)`,
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
            draggable={false}
          />
        </div>
      )}
      {/* Avatar mockup */}
      <div className="absolute right-2 z-30" style={{ top: "calc(25% - 15px)" }}>
        <div className="w-8 h-8 rounded-full bg-purple-600 border border-white/30" />
      </div>
      {/* Content */}
      <div className="absolute inset-x-0 top-[30%] p-2 text-white text-[6px] space-y-0.5 z-20">
        <div className="text-right font-black">Super Admin</div>
        <div className="text-right opacity-70 text-[5px]">ID:1</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Common Tuner Section — يستقبل slot key + values
// ═══════════════════════════════════════════════════════════
function TunerSection({
  level, slotKey, title, accentColor, defaultY = -70,
}: {
  level: number;
  slotKey: string; // "top" | "top.full"
  title: string;
  accentColor: string;
  defaultY?: number;
}) {
  const assets = useAssets();
  const assetsFull = useAssetsFull();
  const setAsset = useMutation(api.assets.set);

  const fullKey = `vip.${slotKey}.${level}`;
  const full = assetsFull[fullKey];
  const hasImage = !!assets[fullKey];

  const [width, setWidth] = useState<number>(100);
  const [yOff, setYOff] = useState<number>(defaultY);
  const [xOff, setXOff] = useState<number>(0);
  const [scale, setScale] = useState<number>(100);
  const [saving, setSaving] = useState(false);

  // Sync when level changes
  useEffect(() => {
    setWidth(full?.canvasSize ?? 100);
    setYOff(full?.offsetY ?? defaultY);
    setXOff(full?.offsetX ?? 0);
    setScale(full?.holeSize ?? 100);
  }, [level, full?.canvasSize, full?.offsetY, full?.offsetX, full?.holeSize]);

  const save = async () => {
    if (!hasImage) {
      dialog.alert("ارفع الصورة أولاً من تبويب VIP");
      return;
    }
    setSaving(true);
    try {
      await setAsset({
        key: fullKey,
        imageUrl: assets[fullKey],
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

  const copyFromOther = () => {
    // نسخ القيم من القمة الأخرى
    const otherKey = slotKey === "top" ? `vip.top.full.${level}` : `vip.top.${level}`;
    const other = assetsFull[otherKey];
    if (other) {
      setWidth(other.canvasSize ?? 100);
      setYOff(other.offsetY ?? defaultY);
      setXOff(other.offsetX ?? 0);
      setScale(other.holeSize ?? 100);
    }
  };

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: "rgba(0,0,0,0.4)",
        borderColor: `${accentColor}66`,
      }}
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black" style={{ color: accentColor }}>
          {title}
        </div>
        {hasImage ? (
          <button
            onClick={copyFromOther}
            className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/70 active:scale-95"
          >
            نسخ من الآخر
          </button>
        ) : (
          <span className="text-[9px] text-red-400">⚠️ ارفع الصورة أولاً</span>
        )}
      </div>

      <Slider label="العرض %" value={width} setValue={setWidth} min={0} max={200} unit="%" />
      <Slider label="Y (سالب = أعلى)" value={yOff} setValue={setYOff} min={-300} max={200} unit="px" />
      <Slider label="X (سالب = يسار)" value={xOff} setValue={setXOff} min={-200} max={200} unit="px" />
      <Slider label="الحجم %" value={scale} setValue={setScale} min={0} max={300} unit="%" />

      <button
        onClick={save}
        disabled={saving || !hasImage}
        className="w-full py-2 rounded-lg font-black text-xs active:scale-95 disabled:opacity-40"
        style={{
          background: accentColor,
          color: "#000",
        }}
      >
        {saving ? "..." : `حفظ ${title}`}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function AssetTunerTab() {
  const [level, setLevel] = useState(4);
  const assets = useAssets();
  const assetsFull = useAssetsFull();

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

      {/* Info */}
      <div className="text-[9px] text-white/50 text-center">
        قيمتان مستقلتان — كل واحد له موضعه وحجمه الخاص
      </div>

      {/* ═══ SECTION 1: MiniProfile ═══ */}
      <div className="rounded-2xl border border-purple-400/40 bg-purple-500/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-purple-300 text-sm font-black">📱 MiniProfile</div>
          <div className="text-[9px] text-purple-300/60 font-mono">vip.top.{level}</div>
        </div>

        {/* Preview — full width but centered and smaller */}
        <div className="flex justify-center">
          <div className="w-40">
            <MiniPreview level={level} assets={assets} assetsFull={assetsFull} />
          </div>
        </div>

        {/* Sliders below — full width */}
        <TunerSection
          level={level}
          slotKey="top"
          title="🎯 قمة الميني"
          accentColor="#a855f7"
          defaultY={-70}
        />
      </div>

      {/* ═══ SECTION 2: Profile ═══ */}
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-emerald-300 text-sm font-black">👤 Profile</div>
          <div className="text-[9px] text-emerald-300/60 font-mono">vip.top.full.{level}</div>
        </div>

        {/* Preview — full width but centered and smaller */}
        <div className="flex justify-center">
          <div className="w-40">
            <ProfilePreview level={level} assets={assets} assetsFull={assetsFull} />
          </div>
        </div>

        {/* Sliders below — full width */}
        <TunerSection
          level={level}
          slotKey="top.full"
          title="🎯 قمة البروفايل"
          accentColor="#10b981"
          defaultY={-55}
        />
      </div>
    </div>
  );
}
