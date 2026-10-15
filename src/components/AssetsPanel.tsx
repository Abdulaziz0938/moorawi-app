// [moorawi-assets] AssetsPanel — unified admin panel for ALL assets
// Tabs: VIP | Medals | Gifts | Shop | Admin | UI

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import { useAssets } from "../lib/assets";
import GiftAdminPanel from "./GiftAdminPanel";
import BannersPanel from "./BannersPanel";
import BubbleSlicer from "./BubbleSlicer";
import VipAvatar from "./ui/VipAvatar";
import {
  Crown, Gift, Award, Shield, ShoppingBag, LayoutGrid,
  Upload, RotateCcw, Loader2, Pencil, Save, X, Home, MessageCircle,
  Image as ImageIcon, Compass, User, Mic, Grid2x2, Send, Bell,
  Trophy, Heart, Search, ChevronLeft, Hash, Settings, Users, Megaphone,
  Plus, Trash2, Move, Sparkles,
} from "lucide-react";


function detectResourceType(file: File): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

interface Props {
  token: string | null;
}

type MainTab = "vip" | "medals" | "gifts" | "bubbles" | "shop" | "banners" | "frames" | "admin" | "ui";

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

  // ===== Sheet headers =====
  { key: "ui.sheet.visits",       label: "صفحة — الزيارات" },
  { key: "ui.sheet.support",      label: "صفحة — خدمة عملاء" },
  { key: "ui.sheet.verify",       label: "صفحة — المصادقة" },
  { key: "ui.sheet.relation",     label: "صفحة — العلاقة" },
  { key: "ui.sheet.level",        label: "صفحة — المستوى" },
  { key: "ui.sheet.mission",      label: "صفحة — المهام" },
  { key: "ui.sheet.legend",       label: "صفحة — الأسطورة" },
  { key: "ui.sheet.supporter",    label: "صفحة — الداعم المحترم" },
  { key: "ui.sheet.supporterVip", label: "صفحة — VIP الداعمين" },
  { key: "ui.sheet.language",     label: "صفحة — اللغة" },
  { key: "ui.sheet.dailyLogin",   label: "صفحة — الدخول اليومي" },
  { key: "ui.sheet.agency",       label: "صفحة — الوكالة" },
  { key: "ui.sheet.agencyCreate", label: "صفحة — إنشاء وكالة" },
  { key: "ui.sheet.profile",      label: "صفحة — الملف الشخصي" },
  { key: "ui.sheet.wallet",       label: "صفحة — المحفظة" },
  { key: "ui.sheet.shop",         label: "صفحة — المتجر" },
  { key: "ui.sheet.vip",          label: "صفحة — VIP Shop" },
  { key: "ui.sheet.settings",     label: "صفحة — الإعدادات" },
  { key: "ui.sheet.notif",        label: "صفحة — إشعارات النظام" },
  { key: "ui.sheet.friends",      label: "صفحة — طلبات الصداقة" },
  { key: "ui.sheet.dm",           label: "صفحة — محادثة مباشرة" },

  // ===== Badges =====
  { key: "ui.badge.verified",     label: "شارة — حساب موثق" },
];

export default function AssetsPanel({ token }: Props) {
  const [tab, setTab] = useState<MainTab>("vip");

  return (
    <div className="p-3 space-y-3">
      {/* Main tabs — 6 columns */}
      <div className="grid grid-cols-4 gap-1.5">
        <TabBtn active={tab === "vip"}     onClick={() => setTab("vip")}     icon={Crown}        label="VIP" />
        <TabBtn active={tab === "medals"}  onClick={() => setTab("medals")}  icon={Award}        label="الميداليات" />
        <TabBtn active={tab === "banners"} onClick={() => setTab("banners")} icon={Megaphone}    label="إعلانات" />
        <TabBtn active={tab === "gifts"}   onClick={() => setTab("gifts")}   icon={Gift}         label="الهدايا" />
        <TabBtn active={tab === "bubbles"} onClick={() => setTab("bubbles")} icon={MessageCircle} label="الفقاعات" />
        <TabBtn active={tab === "shop"}    onClick={() => setTab("shop")}    icon={ShoppingBag}  label="المتجر" />
        <TabBtn active={tab === "frames"}  onClick={() => setTab("frames")}  icon={Move}         label="ضبط الإطارات" />
        <TabBtn active={tab === "admin"}   onClick={() => setTab("admin")}   icon={Shield}       label="الأدمن" />
        <TabBtn active={tab === "ui"}      onClick={() => setTab("ui")}      icon={LayoutGrid}   label="الواجهة" />
      </div>

      {tab === "vip" && <VipAssetsTab token={token} />}
      {tab === "medals" && <MedalsTab token={token} />}
      {tab === "gifts" && <GiftAdminPanel />}

      {tab === "banners" && <BannersPanel token={token} />}

      {tab === "bubbles" && <BubbleSlicer token={token} />}
      {tab === "shop" && <ShopTab token={token} />}
      {tab === "frames" && <FramesTunerTab token={token} />}
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
      const res = await smartUpload(file, { allowVideo: true });
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
      const res = await smartUpload(file, { allowVideo: true });
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
      const res = await smartUpload(file, { allowVideo: true });
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
                  <input type="file" accept="image/*,video/*" className="hidden"
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
  const updateItem = useMutation(api.shop.updateItemAssets);
  const createItem = useMutation(api.shop.createItem);
  const deleteItem = useMutation(api.shop.deleteItem);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<Id<"shopItems"> | null>(null);
  const [editName, setEditName] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const handleFile = async (itemId: Id<"shopItems">, file: File) => {
    setBusyId(itemId);
    try {
      const res = await smartUpload(file, { allowVideo: true });
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

  const handleDelete = async (itemId: any) => {
    dialog.confirm("حذف هذا العنصر؟", async () => {
      setBusyId(itemId);
      try {
        await deleteItem({ itemId, tokenOverride: token ?? undefined });
        dialog.alert("تم الحذف");
      } catch (e: any) { dialog.alert(e?.message || "فشل"); }
      finally { setBusyId(null); }
    }, "حذف", "حذف");
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
      <button

        onClick={() => setShowCreate(true)}

        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black flex items-center justify-center gap-2 active:scale-95"

      >

        <Plus size={16} /> إضافة عنصر جديد

      </button>

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
                  <input type="file" accept="image/*,video/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(it._id, f); e.target.value = ""; }} />
                </label>
                <button onClick={() => handleDelete(it._id)} disabled={isBusy}
                  className="p-2 rounded-lg bg-red-500/25 border border-red-400/40 text-red-200 disabled:opacity-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })
      )}
    {showCreate && (
      <CreateItemModal
        token={token}
        onClose={() => setShowCreate(false)}
        onCreate={async (data: any) => {
          await createItem({ ...data, tokenOverride: token ?? undefined });
        }}
      />
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
          <input type="file" accept="image/*,video/*" className="hidden"
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

// ============================ CreateItemModal
function CreateItemModal({ token, onClose, onCreate }: any) {
  const [category, setCategory] = useState("frame");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("1000");
  const [rarity, setRarity] = useState("common");
  const [durationDays, setDurationDays] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frameScale, setFrameScale] = useState("1.4");
  const [frameOffsetX, setFrameOffsetX] = useState("0");
  const [frameOffsetY, setFrameOffsetY] = useState("0");

  const CATS = ["frame", "vehicle", "entryEffect", "chatBubble", "soundWave", "profileCard", "decoration", "vipId", "skin"];
  const RARITIES = ["common", "rare", "epic", "legendary", "mythic"];

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const res = await smartUpload(file, { allowVideo: true });
      setImageUrl(res.url);
    } catch (e: any) { dialog.alert(e?.message || "فشل الرفع"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { dialog.alert("أدخل اسم العنصر"); return; }
    const p = parseInt(price, 10);
    if (isNaN(p) || p < 0) { dialog.alert("سعر غير صالح"); return; }
    setBusy(true);
    try {
      const isFrameLike = ["frame", "halo", "profileCard", "vehicle"].includes(category);
      await onCreate({
        category,
        name: name.trim(),
        price: p,
        rarity,
        imageUrl: imageUrl || undefined,
        durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
        frameScale: isFrameLike ? parseFloat(frameScale) || 1.8 : undefined,
        frameOffsetX: isFrameLike ? parseInt(frameOffsetX, 10) || 0 : undefined,
        frameOffsetY: isFrameLike ? parseInt(frameOffsetY, 10) || 0 : undefined,
      });
      dialog.alert("تم إنشاء العنصر");
      onClose();
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-black">إضافة عنصر جديد</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-white/70 text-xs font-bold mb-1 block">الصورة</label>
            <label className="block cursor-pointer">
              <div className="w-full h-32 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden">
                {uploading ? <Loader2 size={24} className="animate-spin text-white/60" /> :
                 imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-contain p-2" /> :
                 <span className="text-white/40 text-xs">اضغط لرفع صورة</span>}
              </div>
              <input type="file" accept="image/*,video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }} />
            </label>
          </div>

          <div>
            <label className="text-white/70 text-xs font-bold mb-1 block">الاسم</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: إطار ذهبي"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400" />
          </div>

          <div>
            <label className="text-white/70 text-xs font-bold mb-1 block">الفئة</label>
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {CATS.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-black " + (category === c ? "bg-purple-500/30 border-purple-400/60 text-white" : "bg-white/5 border-white/10 text-white/60")}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white/70 text-xs font-bold mb-1 block">الندرة</label>
            <div className="flex gap-1">
              {RARITIES.map((r) => (
                <button key={r} onClick={() => setRarity(r)}
                  className={"flex-1 py-1.5 rounded-lg border text-[10px] font-black " + (rarity === r ? "bg-amber-500/30 border-amber-400/60 text-white" : "bg-white/5 border-white/10 text-white/60")}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-white/70 text-xs font-bold mb-1 block">السعر</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 tabular-nums"
                dir="ltr" />
            </div>
            <div>
              <label className="text-white/70 text-xs font-bold mb-1 block">مدة (أيام)</label>
              <input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="—"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 tabular-nums"
                dir="ltr" />
            </div>
          </div>

          {/* Frame placement — only for frame-like categories */}
          {["frame", "halo", "profileCard", "vehicle"].includes(category) && (
            <div className="rounded-2xl bg-purple-500/10 border border-purple-400/30 p-3 space-y-2">
              <p className="text-purple-200 text-[10px] font-black text-center">
                ضبط الإطار (Yalla/SUGO Standard)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-white/60 text-[10px] font-bold mb-1 block">Scale</label>
                  <input type="number" step="0.05" value={frameScale} onChange={(e) => setFrameScale(e.target.value)}
                    placeholder="3.0"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-purple-400 tabular-nums"
                    dir="ltr" />
                </div>
                <div>
                  <label className="text-white/60 text-[10px] font-bold mb-1 block">Offset X</label>
                  <input type="number" value={frameOffsetX} onChange={(e) => setFrameOffsetX(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-purple-400 tabular-nums"
                    dir="ltr" />
                </div>
                <div>
                  <label className="text-white/60 text-[10px] font-bold mb-1 block">Offset Y</label>
                  <input type="number" value={frameOffsetY} onChange={(e) => setFrameOffsetY(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-purple-400 tabular-nums"
                    dir="ltr" />
                </div>
              </div>
              <p className="text-white/40 text-[9px] text-center leading-tight">
                Scale 1.0 = نفس حجم الأفاتار · 2.5-3.5 للمعظم
              </p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={busy || uploading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            إنشاء العنصر
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================ FramesTunerTab
function FramesTunerTab({ token }: { token: string | null }) {
  const CATEGORIES = [
    { key: "frame",       label: "إطارات المتجر" },
    { key: "halo",        label: "الهالات" },
    { key: "vehicle",     label: "المركبات" },
    { key: "profileCard", label: "البطاقات" },
    { key: "vipframes",   label: "⭐ إطارات VIP" },
  ];
  const [category, setCategory] = useState<string>("frame");
  const [selectedId, setSelectedId] = useState<Id<"shopItems"> | null>(null);
  const [scale, setScale] = useState<number>(1.4);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  // Canvas Standard
  const [canvasMode, setCanvasMode] = useState<"manual" | "canvas">("canvas");
  const [canvasSize, setCanvasSize] = useState<number>(500);
  const [holeSize, setHoleSize] = useState<number>(300);
  const [canvasOffsetX, setCanvasOffsetX] = useState<number>(0);
  const [canvasOffsetY, setCanvasOffsetY] = useState<number>(0);
  const [assetType, setAssetType] = useState<"png" | "svga" | "lottie">("png");

  const setAsset = useMutation(api.assets.set);
  const allAssets = useQuery(api.assets.list);
  const isVipCategory = category === "vipframes";
  const shopItems = useQuery(
    api.shop.listByCategory,
    isVipCategory ? "skip" as any : { category, limit: 100 }
  );
  const vipItems = isVipCategory
    ? [1, 2, 3, 4, 5, 6, 7].map((n) => {
        const key = `vip.frame.${n}`;
        const row = (allAssets ?? []).find((a: any) => a.key === key);
        return {
          _id: `vip-${n}` as any,
          key,
          name: `VIP ${n}`,
          imageUrl: row?.imageUrl ?? null,
          frameScale: (row as any)?.frameScale,
          frameOffsetX: (row as any)?.frameOffsetX,
          frameOffsetY: (row as any)?.frameOffsetY,
          isVip: true,
        };
      })
    : [];
  const items = isVipCategory ? vipItems : shopItems;
  const updateItem = useMutation(api.shop.updateItemAssets);

  const selected = (items ?? []).find((i: any) => i._id === selectedId);

  const handleSelect = (item: any) => {
    setSelectedId(item._id);
    setScale(item.frameScale ?? 3.0);
    setOffsetX(item.frameOffsetX ?? 0);
    setOffsetY(item.frameOffsetY ?? 0);
    // Canvas Standard
    if (item.canvasSize && item.holeSize) {
      setCanvasMode("canvas");
      setCanvasSize(item.canvasSize);
      setHoleSize(item.holeSize);
      setCanvasOffsetX(item.offsetX ?? 0);
      setCanvasOffsetY(item.offsetY ?? 0);
      setAssetType(item.assetType ?? "png");
    } else {
      setCanvasMode("manual");
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const useCanvas = canvasMode === "canvas";
      const payload: any = useCanvas ? {
        canvasSize,
        holeSize,
        offsetX: canvasOffsetX,
        offsetY: canvasOffsetY,
        assetType,
      } : {
        frameScale: scale,
        frameOffsetX: offsetX,
        frameOffsetY: offsetY,
      };
      if (isVipCategory) {
        await setAsset({
          key: (selected as any).key,
          imageUrl: (selected as any).imageUrl ?? "",
          ...payload,
          tokenOverride: token ?? undefined,
        });
      } else {
        await updateItem({
          itemId: selectedId as Id<"shopItems">,
          ...payload,
          tokenOverride: token ?? undefined,
        });
      }
      dialog.alert("✓ تم حفظ الإعدادات");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setScale(3.0);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleApplyAll = async () => {
    const list = (items ?? []).filter((it: any) => it.imageUrl);
    if (list.length === 0) {
      dialog.alert("لا توجد إطارات في هذه الفئة");
      return;
    }
    dialog.confirm(
      `تطبيق الإعدادات الحالية (Scale ${scale.toFixed(2)}) على ${list.length} إطار؟`,
      async () => {
        setSaving(true);
        try {
          for (const it of list) {
            if (isVipCategory) {
              await setAsset({
                key: (it as any).key,
                imageUrl: (it as any).imageUrl ?? "",
                frameScale: scale,
                frameOffsetX: offsetX,
                frameOffsetY: offsetY,
                tokenOverride: token ?? undefined,
              });
            } else {
              await updateItem({
                itemId: it._id,
                frameScale: scale,
                frameOffsetX: offsetX,
                frameOffsetY: offsetY,
                tokenOverride: token ?? undefined,
              });
            }
          }
          dialog.alert(`✓ تم تطبيق الإعدادات على ${list.length} عنصر`);
        } catch (e: any) {
          dialog.alert(e?.message || "فشل التطبيق");
        } finally {
          setSaving(false);
        }
      },
      "تطبيق على الكل",
      "تطبيق"
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 border border-purple-400/30 p-3">
        <p className="text-white text-xs font-black text-center">🎛️ ضبط الإطارات (Yalla/SUGO Standard)</p>
        <p className="text-white/50 text-[10px] text-center mt-1">
          اختر إطاراً → اضبطه بمعاينة مباشرة → احفظ
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setSelectedId(null); }}
            className={`flex-shrink-0 px-3 py-2 rounded-full border text-[11px] font-black transition ${
              category === c.key
                ? "bg-purple-500/30 border-purple-400/60 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {items === undefined ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-white/40" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-white/40 text-xs text-center py-6">لا توجد عناصر في هذه الفئة</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
          {items.map((it: any) => (
            <button
              key={it._id}
              onClick={() => handleSelect(it)}
              className={`aspect-square rounded-xl border overflow-hidden transition ${
                selectedId === it._id
                  ? "border-purple-400 ring-2 ring-purple-400/60"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              {it.imageUrl ? (
                <img src={it.imageUrl} alt={it.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white/30 text-[9px]">—</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tuner — يظهر عندما يُختار إطار */}
      {selected && (
        <>
          <div className="rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col items-center gap-3">
            <p className="text-white/60 text-[10px] font-bold">معاينة حية</p>
            <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
              <VipAvatar
                src={null}
                name="E"
                size={100}
                vip={0}
                ring={false}
                customFrameUrl={selected.imageUrl}
                frameScale={scale}
                frameOffsetX={offsetX}
                frameOffsetY={offsetY}
              />
            </div>
            <p className="text-white/40 text-[10px]">{selected.name}</p>
          </div>

          <div className="rounded-2xl bg-purple-500/10 border border-purple-400/30 p-3 space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setCanvasMode("canvas")}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition ${canvasMode === "canvas" ? "bg-purple-500/30 border border-purple-400/60 text-white" : "bg-white/5 border border-white/10 text-white/60"}`}
              >
                🎨 Canvas Standard (Yalla)
              </button>
              <button
                onClick={() => setCanvasMode("manual")}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition ${canvasMode === "manual" ? "bg-purple-500/30 border border-purple-400/60 text-white" : "bg-white/5 border border-white/10 text-white/60"}`}
              >
                ⚙️ يدوي (Scale)
              </button>
            </div>

            {canvasMode === "canvas" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/60 text-[10px] font-bold mb-1 block">Canvas Size</label>
                    <input type="number" value={canvasSize} onChange={(e) => setCanvasSize(parseInt(e.target.value) || 500)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs tabular-nums"
                      dir="ltr" />
                  </div>
                  <div>
                    <label className="text-white/60 text-[10px] font-bold mb-1 block">Hole Size</label>
                    <input type="number" value={holeSize} onChange={(e) => setHoleSize(parseInt(e.target.value) || 300)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs tabular-nums"
                      dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/60 text-[10px] font-bold mb-1 block">Offset X</label>
                    <input type="number" value={canvasOffsetX} onChange={(e) => setCanvasOffsetX(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs tabular-nums"
                      dir="ltr" />
                  </div>
                  <div>
                    <label className="text-white/60 text-[10px] font-bold mb-1 block">Offset Y</label>
                    <input type="number" value={canvasOffsetY} onChange={(e) => setCanvasOffsetY(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs tabular-nums"
                      dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-[10px] font-bold mb-1 block">Asset Type</label>
                  <div className="flex gap-1">
                    {(["png", "svga", "lottie"] as const).map((t) => (
                      <button key={t} onClick={() => setAssetType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition ${assetType === t ? "bg-emerald-500/30 border border-emerald-400/60 text-white" : "bg-white/5 border border-white/10 text-white/60"}`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-emerald-200 text-[10px] text-center font-black pt-1">
                  Auto Scale = {(canvasSize / holeSize).toFixed(3)}
                </p>
              </div>
            ) : (
              <>
            {/* Scale */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/70 text-xs font-bold">Scale (تكبير)</label>
                <span className="text-purple-200 text-xs font-black tabular-nums" dir="ltr">
                  {scale.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full"
                dir="ltr"
              />
            </div>

            {/* Offset X */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/70 text-xs font-bold">Offset X (إزاحة أفقية)</label>
                <span className="text-purple-200 text-xs font-black tabular-nums" dir="ltr">
                  {offsetX}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={offsetX}
                onChange={(e) => setOffsetX(parseInt(e.target.value))}
                className="w-full"
                dir="ltr"
              />
            </div>

            {/* Offset Y */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/70 text-xs font-bold">Offset Y (إزاحة عمودية)</label>
                <span className="text-purple-200 text-xs font-black tabular-nums" dir="ltr">
                  {offsetY}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={offsetY}
                onChange={(e) => setOffsetY(parseInt(e.target.value))}
                className="w-full"
                dir="ltr"
              />
            </div>
              </>
            )}

            <button
              onClick={handleApplyAll}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={14} /> تطبيق على كل عناصر "{category}"</>}
            </button>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={14} /> حفظ (فقط المحدد)</>}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white/70 text-sm font-black disabled:opacity-50 active:scale-95"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
