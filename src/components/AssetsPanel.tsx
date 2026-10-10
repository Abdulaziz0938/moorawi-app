// [moorawi-assets] AssetsPanel — admin panel for all image assets
// Tabs: VIP (7 levels x 9 slots) | Medals | Gifts | Admin badges

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import { useAssets } from "../lib/assets";
import GiftAdminPanel from "./GiftAdminPanel";
import {
  Crown, Gift, Award, Shield, Upload, RotateCcw, Loader2,
  Pencil, Save, X,
} from "lucide-react";

interface Props {
  token: string | null;
}

type MainTab = "vip" | "medals" | "gifts" | "admin";

const VIP_SLOTS = [
  { key: "logo",     label: "الشعار" },
  { key: "medal",    label: "الميدالية" },
  { key: "frame",    label: "الإطار" },
  { key: "halo",     label: "الهالة" },
  { key: "card",     label: "البطاقة" },
  { key: "nickname", label: "الاسم" },
  { key: "entry",    label: "الدخول" },
  { key: "wave",     label: "الموجة" },
  { key: "bubble",   label: "الفقاعات" },
];

const ADMIN_SLOTS = [
  { key: "admin.super",     label: "شارة المالك" },
  { key: "admin.moderator", label: "شارة المشرف" },
];

export default function AssetsPanel({ token }: Props) {
  const assets = useAssets();
  const [tab, setTab] = useState<MainTab>("vip");
  const [vipLevel, setVipLevel] = useState<number>(1);

  return (
    <div className="p-4 space-y-4">
      {/* Main tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        <TabBtn active={tab === "vip"}     onClick={() => setTab("vip")}     icon={Crown} label="VIP" />
        <TabBtn active={tab === "medals"}  onClick={() => setTab("medals")}  icon={Award} label="الميداليات" />
        <TabBtn active={tab === "gifts"}   onClick={() => setTab("gifts")}   icon={Gift}  label="الهدايا" />
        <TabBtn active={tab === "admin"}   onClick={() => setTab("admin")}   icon={Shield} label="الأدمن" />
      </div>

      {tab === "vip" && (
        <VipAssetsTab assets={assets} token={token} level={vipLevel} setLevel={setVipLevel} />
      )}

      {tab === "medals" && <MedalsTab token={token} />}

      {tab === "gifts" && <GiftAdminPanel />}

      {tab === "admin" && <SimpleSlotsTab assets={assets} token={token} slots={ADMIN_SLOTS} />}
    </div>
  );
}

// ============================ Tabs button
function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`py-2 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-0.5 ${
        active
          ? "bg-purple-500/30 border border-purple-400/60 text-white"
          : "bg-white/5 border border-white/10 text-white/60"
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

// ============================ VIP tab
function VipAssetsTab({ assets, token, level, setLevel }: any) {
  const setAsset = useMutation(api.assets.set);
  const clearAsset = useMutation(api.assets.clear);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleFile = async (key: string, file: File) => {
    setBusyKey(key);
    try {
      const res = await uploadToCloudinary(file, "image");
      await setAsset({ key, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع بنجاح");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setBusyKey(null);
    }
  };

  const handleClear = (key: string) => {
    dialog.confirm(
      "إعادة الصورة الافتراضية؟",
      async () => {
        setBusyKey(key);
        try {
          await clearAsset({ key, tokenOverride: token ?? undefined });
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        } finally {
          setBusyKey(null);
        }
      },
      "إعادة تعيين",
      "إعادة"
    );
  };

  const uploaded = VIP_SLOTS.filter((s: any) => assets[`vip.${s.key}.${level}`]).length;

  return (
    <>
      {/* Level tabs */}
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-black transition ${
              lvl === level
                ? "bg-white/15 border-white/40 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            VIP {lvl}
          </button>
        ))}
      </div>

      <div className="text-white/50 text-[11px] text-center">
        {uploaded}/{VIP_SLOTS.length} مرفوعة
      </div>

      <div className="grid grid-cols-2 gap-3">
        {VIP_SLOTS.map((slot: any) => {
          const key = `vip.${slot.key}.${level}`;
          return (
            <AssetCard
              key={key}
              slotKey={key}
              label={`${slot.label} — VIP ${level}`}
              src={assets[key]}
              busy={busyKey === key}
              onUpload={handleFile}
              onClear={handleClear}
            />
          );
        })}
      </div>
    </>
  );
}

// ============================ Simple slots tab (admin)
function SimpleSlotsTab({ assets, token, slots }: any) {
  const setAsset = useMutation(api.assets.set);
  const clearAsset = useMutation(api.assets.clear);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleFile = async (key: string, file: File) => {
    setBusyKey(key);
    try {
      const res = await uploadToCloudinary(file, "image");
      await setAsset({ key, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusyKey(null);
    }
  };

  const handleClear = (key: string) => {
    dialog.confirm("إعادة الصورة الافتراضية؟", async () => {
      setBusyKey(key);
      try {
        await clearAsset({ key, tokenOverride: token ?? undefined });
      } finally {
        setBusyKey(null);
      }
    }, "إعادة", "إعادة");
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((s: any) => (
        <AssetCard
          key={s.key}
          slotKey={s.key}
          label={s.label}
          src={assets[s.key]}
          busy={busyKey === s.key}
          onUpload={handleFile}
          onClear={handleClear}
        />
      ))}
    </div>
  );
}

// ============================ Medals tab
function MedalsTab({ token }: { token: string | null }) {
  const medals = useQuery(api.medals.listAll, {});
  const updateMedal = useMutation(api.medals.updateMedal);
  const [editId, setEditId] = useState<Id<"medals"> | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleFile = async (medalId: Id<"medals">, file: File) => {
    setBusyId(medalId);
    try {
      const res = await uploadToCloudinary(file, "image");
      await updateMedal({ medalId, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (medal: any) => {
    setEditId(medal._id);
    setEditName(medal.name);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusyId(editId);
    try {
      await updateMedal({ medalId: editId, name: editName, tokenOverride: token ?? undefined });
      setEditId(null);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-[11px] text-center">
        {medals?.length ?? 0} ميدالية — يمكن تعديل الاسم والصورة
      </p>
      {medals === undefined ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-white/40" size={20} />
        </div>
      ) : (
        medals.map((m: any) => {
          const isEditing = editId === m._id;
          const isBusy = busyId === m._id;
          return (
            <div key={m._id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0">
                {isBusy ? (
                  <Loader2 size={16} className="animate-spin text-white/50" />
                ) : m.imageUrl ? (
                  <img src={m.imageUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Award size={20} className="text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm"
                    autoFocus
                  />
                ) : (
                  <p className="text-white text-sm font-black truncate">{m.name}</p>
                )}
                <p className="text-white/40 text-[10px] font-mono" dir="ltr">
                  {m.tier} · {m.category}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdit}
                      disabled={isBusy}
                      className="p-2 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200"
                    >
                      <Save size={12} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/60"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEdit(m)}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/70"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <label className="p-2 rounded-lg bg-blue-500/25 border border-blue-400/40 text-blue-200 cursor-pointer">
                  <Upload size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(m._id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ============================ Reusable AssetCard
function AssetCard({ slotKey, label, src, busy, onUpload, onClear }: any) {
  return (
    <div
      className={`rounded-2xl border p-3 flex flex-col items-center gap-2 ${
        src ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="w-full h-20 flex items-center justify-center bg-black/30 rounded-xl overflow-hidden">
        {busy ? (
          <Loader2 size={18} className="animate-spin text-white/60" />
        ) : src ? (
          <img src={src} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-white/25 text-[10px]">لم يُرفع بعد</span>
        )}
      </div>
      <p className="text-white text-[10px] font-black text-center leading-tight">{label}</p>
      <p className="text-white/40 text-[8px] font-mono truncate max-w-full" dir="ltr">{slotKey}</p>
      <div className="flex items-center gap-1.5">
        <label className={`px-2 py-1 rounded-lg text-white text-[10px] font-black cursor-pointer flex items-center gap-1 active:scale-95 transition ${busy ? "opacity-50 pointer-events-none" : ""} bg-blue-500/25 border border-blue-400/40`}>
          <Upload size={10} /> رفع
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(slotKey, f);
              e.target.value = "";
            }}
          />
        </label>
        {src && (
          <button
            onClick={() => onClear(slotKey)}
            disabled={busy}
            className="px-2 py-1 rounded-lg bg-red-500/25 border border-red-400/40 text-white text-[10px] font-black flex items-center gap-1"
          >
            <RotateCcw size={10} /> إعادة
          </button>
        )}
      </div>
    </div>
  );
}
