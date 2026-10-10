// [moorawi-assets] AssetsPanel — unified admin panel for ALL assets
// Tabs: VIP | Medals | Gifts | Shop | Admin | UI

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import { useAssets } from "../lib/assets";
import GiftAdminPanel from "./GiftAdminPanel";
import BubbleSlicer from "./BubbleSlicer";
import {
  Crown, Gift, Award, Shield, ShoppingBag, LayoutGrid,
  Upload, RotateCcw, Loader2, Pencil, Save, X, Home, MessageCircle,
  Image as ImageIcon, Compass, User, Mic, Grid2x2, Send, Bell,
  Trophy, Heart, Search, ChevronLeft, Hash, Settings, Users,
} from "lucide-react";

interface Props {
  token: string | null;
}

type MainTab = "vip" | "medals" | "gifts" | "bubbles" | "shop" | "admin" | "ui";

const VIP_SLOTS = [
  { key: "background", label: "الخلفية" },
  { key: "hero",       label: "الصورة الرئيسية" },
  { key: "logo",       label: "الشعار" },
  { key: "medal",      label: "الميدالية" },
  { key: "frame",      label: "الإطار" },
  { key: "halo",       label: "الهالة" },
  { key: "card",       label: "البطاقة" },
  { key: "nickname",   label: "الاسم" },
  { key: "entry",      label: "الدخول" },
  { key: "wave",       label: "الموجة" },
  { key: "bubble",     label: "الفقاعات" },
];

const ADMIN_SLOTS = [
  { key: "admin.super",     label: "شارة المالك" },
  { key: "admin.moderator", label: "شارة المشرف" },
];

// UI icons — every button/icon in the app can have a custom image
const UI_SLOTS: { key: string; label: string }[] = [
  // Bottom nav
  { key: "ui.nav.home",       label: "شريط سفلي — الغرف" },
  { key: "ui.nav.messages",   label: "شريط سفلي — رسائل" },
  { key: "ui.nav.moments",    label: "شريط سفلي — لحظات" },
  { key: "ui.nav.discover",   label: "شريط سفلي — اكتشاف" },
  { key: "ui.nav.me",         label: "شريط سفلي — أنا" },
  // Top bar
  { key: "ui.topbar.members", label: "توب بار — الأعضاء" },
  { key: "ui.topbar.exit",    label: "توب بار — خروج" },
  { key: "ui.topbar.follow",  label: "توب بار — متابعة" },
  { key: "ui.topbar.search",  label: "توب بار — بحث" },
  { key: "ui.topbar.trophy",  label: "توب بار — كأس" },
  // Room bottom buttons
  { key: "ui.room.gift",      label: "غرفة — هدية" },
  { key: "ui.room.grid",      label: "غرفة — شبكة" },
  { key: "ui.room.mic",       label: "غرفة — مايك" },
  { key: "ui.room.chat",      label: "غرفة — دردشة" },
  // Services (grid)
  { key: "ui.service.wallet",    label: "خدمات — محفظة" },
  { key: "ui.service.supporter", label: "خدمات — الداعم المحترم" },
  { key: "ui.service.store",     label: "خدمات — متجر" },
  { key: "ui.service.vip",       label: "خدمات — VIP" },
  { key: "ui.service.medals",    label: "خدمات — أوسمة" },
  { key: "ui.service.relation",  label: "خدمات — العلاقة" },
  { key: "ui.service.level",     label: "خدمات — مستوى" },
  { key: "ui.service.legend",    label: "خدمات — الأسطورة" },
  { key: "ui.service.host",      label: "خدمات — مضيف" },
  { key: "ui.service.agency",    label: "خدمات — وكالة" },
  // Services (list)
  { key: "ui.service.missions",  label: "خدمات — مهام" },
  { key: "ui.service.verify",    label: "خدمات — مصادقة" },
  { key: "ui.service.visits",    label: "خدمات — زيارات" },
  { key: "ui.service.support",   label: "خدمات — دعم" },
  { key: "ui.service.language",  label: "خدمات — لغة" },
  { key: "ui.service.settings",  label: "خدمات — إعدادات" },
];

export default function AssetsPanel({ token }: Props) {
  const [tab, setTab] = useState<MainTab>("vip");

  return (
    <div className="p-3 space-y-3">
      {/* Main tabs — 6 columns */}
      <div className="grid grid-cols-4 gap-1.5">
        <TabBtn active={tab === "vip"}     onClick={() => setTab("vip")}     icon={Crown}        label="VIP" />
        <TabBtn active={tab === "medals"}  onClick={() => setTab("medals")}  icon={Award}        label="الميداليات" />
        <TabBtn active={tab === "gifts"}   onClick={() => setTab("gifts")}   icon={Gift}         label="الهدايا" />
        <TabBtn active={tab === "bubbles"} onClick={() => setTab("bubbles")} icon={MessageCircle} label="الفقاعات" />
        <TabBtn active={tab === "shop"}    onClick={() => setTab("shop")}    icon={ShoppingBag}  label="المتجر" />
        <TabBtn active={tab === "admin"}   onClick={() => setTab("admin")}   icon={Shield}       label="الأدمن" />
        <TabBtn active={tab === "ui"}      onClick={() => setTab("ui")}      icon={LayoutGrid}   label="الواجهة" />
      </div>

      {tab === "vip" && <VipAssetsTab token={token} />}
      {tab === "medals" && <MedalsTab token={token} />}
      {tab === "gifts" && <GiftAdminPanel />}

      {tab === "bubbles" && <BubbleSlicer token={token} />}
      {tab === "shop" && <ShopTab token={token} />}
      {tab === "admin" && <SimpleSlotsTab token={token} slots={ADMIN_SLOTS} />}
      {tab === "ui" && <SimpleSlotsTab token={token} slots={UI_SLOTS} />}
    </div>
  );
}

// ============================ Tab button
function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`py-2 rounded-xl text-[10px] font-black transition flex flex-col items-center gap-0.5 ${
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
function VipAssetsTab({ token }: any) {
  const assets = useAssets();
  const setAsset = useMutation(api.assets.set);
  const clearAsset = useMutation(api.assets.clear);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [level, setLevel] = useState(1);

  const handleFile = async (key: string, file: File) => {
    setBusyKey(key);
    try {
      const res = await uploadToCloudinary(file, "image");
      await setAsset({ key, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع");
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyKey(null); }
  };
  const handleClear = (key: string) => {
    dialog.confirm("إعادة الافتراضي؟", async () => {
      setBusyKey(key);
      try { await clearAsset({ key, tokenOverride: token ?? undefined }); }
      finally { setBusyKey(null); }
    }, "إعادة", "إعادة");
  };

  const uploaded = VIP_SLOTS.filter((s) => assets[`vip.${s.key}.${level}`]).length;

  return (
    <>
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {[1,2,3,4,5,6,7].map((lvl) => (
          <button key={lvl} onClick={() => setLevel(lvl)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-black ${
              lvl === level ? "bg-white/15 border-white/40 text-white" : "bg-white/5 border-white/10 text-white/60"
            }`}>VIP {lvl}</button>
        ))}
      </div>
      <div className="text-white/50 text-[11px] text-center">{uploaded}/{VIP_SLOTS.length} مرفوعة</div>
      <div className="grid grid-cols-2 gap-3">
        {VIP_SLOTS.map((slot) => {
          const key = `vip.${slot.key}.${level}`;
          return <AssetCard key={key} slotKey={key} label={`${slot.label} — VIP ${level}`}
            src={assets[key]} busy={busyKey === key} onUpload={handleFile} onClear={handleClear} />;
        })}
      </div>
    </>
  );
}

// ============================ Simple slots (admin + ui)
function SimpleSlotsTab({ token, slots }: any) {
  const assets = useAssets();
  const setAsset = useMutation(api.assets.set);
  const clearAsset = useMutation(api.assets.clear);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleFile = async (key: string, file: File) => {
    setBusyKey(key);
    try {
      const res = await uploadToCloudinary(file, "image");
      await setAsset({ key, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع");
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyKey(null); }
  };
  const handleClear = (key: string) => {
    dialog.confirm("إعادة الافتراضي؟", async () => {
      setBusyKey(key);
      try { await clearAsset({ key, tokenOverride: token ?? undefined }); }
      finally { setBusyKey(null); }
    }, "إعادة", "إعادة");
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((s: any) => (
        <AssetCard key={s.key} slotKey={s.key} label={s.label}
          src={assets[s.key]} busy={busyKey === s.key} onUpload={handleFile} onClear={handleClear} />
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
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyId(null); }
  };
  const startEdit = (m: any) => { setEditId(m._id); setEditName(m.name); };
  const saveEdit = async () => {
    if (!editId) return;
    setBusyId(editId);
    try {
      await updateMedal({ medalId: editId, name: editName, tokenOverride: token ?? undefined });
      setEditId(null);
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-[11px] text-center">{medals?.length ?? 0} ميدالية</p>
      {medals === undefined ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={20} /></div>
      ) : (
        medals.map((m: any) => {
          const isEditing = editId === m._id;
          const isBusy = busyId === m._id;
          return (
            <div key={m._id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0">
                {isBusy ? <Loader2 size={16} className="animate-spin text-white/50" /> :
                  m.imageUrl ? <img src={m.imageUrl} alt="" className="w-full h-full object-contain" /> :
                  <Award size={20} className="text-white/40" />}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm" autoFocus />
                ) : (
                  <p className="text-white text-sm font-black truncate">{m.name}</p>
                )}
                <p className="text-white/40 text-[10px] font-mono" dir="ltr">{m.tier} · {m.category}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} disabled={isBusy}
                      className="p-2 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200">
                      <Save size={12} /></button>
                    <button onClick={() => setEditId(null)}
                      className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/60">
                      <X size={12} /></button>
                  </>
                ) : (
                  <button onClick={() => startEdit(m)}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/70">
                    <Pencil size={12} /></button>
                )}
                <label className="p-2 rounded-lg bg-blue-500/25 border border-blue-400/40 text-blue-200 cursor-pointer">
                  <Upload size={12} />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(m._id, f); e.target.value = ""; }} />
                </label>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ============================ Shop tab
function ShopTab({ token }: { token: string | null }) {
  const items = useQuery(api.shop.listAllAdmin, { tokenOverride: token ?? undefined });
  const updateItem = useMutation(api.shop.updateItem);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<Id<"shopItems"> | null>(null);
  const [editName, setEditName] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const handleFile = async (itemId: Id<"shopItems">, file: File) => {
    setBusyId(itemId);
    try {
      const res = await uploadToCloudinary(file, "image");
      await updateItem({ itemId, imageUrl: res.url, tokenOverride: token ?? undefined });
      dialog.alert("تم الرفع");
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyId(null); }
  };
  const startEdit = (it: any) => { setEditId(it._id); setEditName(it.name); };
  const saveEdit = async () => {
    if (!editId) return;
    setBusyId(editId);
    try {
      await updateItem({ itemId: editId, name: editName, tokenOverride: token ?? undefined });
      setEditId(null);
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusyId(null); }
  };

  const CATS = ["all", "frame", "vehicle", "entryEffect", "chatBubble", "soundWave", "profileCard", "decoration", "vipId", "skin"];
  const CAT_LABEL: Record<string, string> = {
    all: "الكل", frame: "إطار", vehicle: "مركبة", entryEffect: "دخول",
    chatBubble: "فقاعات", soundWave: "موجة", profileCard: "بطاقة",
    decoration: "ديكور", vipId: "معرف VIP", skin: "خلفية",
  };

  const filtered = filter === "all" ? items : items?.filter((i: any) => i.category === filter);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {CATS.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black ${
              filter === c ? "bg-white/15 border-white/40 text-white" : "bg-white/5 border-white/10 text-white/60"
            }`}>{CAT_LABEL[c]}</button>
        ))}
      </div>

      <p className="text-white/50 text-[11px] text-center">{filtered?.length ?? 0} منتج</p>

      {items === undefined ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={20} /></div>
      ) : (
        filtered?.map((it: any) => {
          const isEditing = editId === it._id;
          const isBusy = busyId === it._id;
          return (
            <div key={it._id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0">
                {isBusy ? <Loader2 size={16} className="animate-spin text-white/50" /> :
                  it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-contain" /> :
                  <ShoppingBag size={20} className="text-white/40" />}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm" autoFocus />
                ) : (
                  <p className="text-white text-sm font-black truncate">{it.name}</p>
                )}
                <p className="text-white/40 text-[10px] font-mono" dir="ltr">
                  {it.category} · {it.price.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} disabled={isBusy}
                      className="p-2 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200">
                      <Save size={12} /></button>
                    <button onClick={() => setEditId(null)}
                      className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/60">
                      <X size={12} /></button>
                  </>
                ) : (
                  <button onClick={() => startEdit(it)}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/70">
                    <Pencil size={12} /></button>
                )}
                <label className="p-2 rounded-lg bg-blue-500/25 border border-blue-400/40 text-blue-200 cursor-pointer">
                  <Upload size={12} />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(it._id, f); e.target.value = ""; }} />
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
    <div className={`rounded-2xl border p-3 flex flex-col items-center gap-2 ${
      src ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-white/5"
    }`}>
      <div className="w-full h-20 flex items-center justify-center bg-black/30 rounded-xl overflow-hidden">
        {busy ? <Loader2 size={18} className="animate-spin text-white/60" /> :
          src ? <img src={src} alt={label} className="max-h-full max-w-full object-contain" /> :
          <span className="text-white/25 text-[10px]">لم يُرفع بعد</span>}
      </div>
      <p className="text-white text-[10px] font-black text-center leading-tight">{label}</p>
      <p className="text-white/40 text-[8px] font-mono truncate max-w-full" dir="ltr">{slotKey}</p>
      <div className="flex items-center gap-1.5">
        <label className={`px-2 py-1 rounded-lg text-white text-[10px] font-black cursor-pointer flex items-center gap-1 active:scale-95 transition ${busy ? "opacity-50 pointer-events-none" : ""} bg-blue-500/25 border border-blue-400/40`}>
          <Upload size={10} /> رفع
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(slotKey, f); e.target.value = ""; }} />
        </label>
        {src && (
          <button onClick={() => onClear(slotKey)} disabled={busy}
            className="px-2 py-1 rounded-lg bg-red-500/25 border border-red-400/40 text-white text-[10px] font-black flex items-center gap-1">
            <RotateCcw size={10} /> إعادة
          </button>
        )}
      </div>
    </div>
  );
}
