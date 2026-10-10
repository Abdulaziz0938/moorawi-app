import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import {
  X, Loader2, ChevronLeft, Shield, Plus, Search, History,
  Image as ImageIcon, Type, Megaphone, MessageSquare, Settings,
  Ban, Mic, Palette, Lock, Briefcase, Eraser, Check,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

type Tab = "list" | "permissions" | "logs";

const PERMISSION_LABELS: Array<{
  key: string;
  label: string;
  desc?: string;
  icon: any;
}> = [
  { key: "roomImage",       label: "صورة الغرفة",          icon: ImageIcon },
  { key: "roomName",        label: "اسم الغرفة",            icon: Type },
  { key: "announcement",    label: "اعلان",                 icon: Megaphone },
  { key: "welcomeMessage",  label: "رسالة ترحيب الغرفة",    icon: MessageSquare },
  { key: "staffSettings",   label: "إعدادات المشرفين",       icon: Settings },
  { key: "blacklist",       label: "القائمة السوداء",       icon: Ban },
  { key: "micManagement",   label: "إدارة المايك (الكمية)",  icon: Mic },
  {
    key: "roomBackground",
    label: "خلفية الغرفة",
    desc: "عند التفعيل، يمكن للسوبر أدمن إضافة أو حذف خلفية غرفتك.",
    icon: Palette,
  },
  { key: "roomLock",        label: "قفل الغرفة",            icon: Lock },
  { key: "agencyMode",      label: "نمط الوكالة",           icon: Briefcase },
  { key: "screenClear",     label: "مسح الشاشة (إذن الأدمن)", icon: Eraser },
];

export default function StaffSettingsSheet({ roomId, onClose }: Props) {
  const token = getActiveToken();
  const room = useQuery(api.rooms.get, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const permissions = useQuery(api.rooms.getStaffPermissions, { roomId });
  const updatePermissions = useMutation(api.rooms.updateStaffPermissions);

  const [tab, setTab] = useState<Tab>("list");
  const [busy, setBusy] = useState(false);

  const mods = members?.filter((m: any) => m.role === "moderator") ?? [];
  const isOwner = room && members && true; // TODO: check via auth

  const handleToggle = async (key: string, value: boolean) => {
    if (!permissions) return;
    setBusy(true);
    try {
      const next = { ...permissions, [key]: value };
      await updatePermissions({
        roomId,
        permissions: next as any,
        tokenOverride: token,
      });
    } catch (e: any) {
      dialog.alert(e?.message || "فشل التحديث");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black" dir="rtl">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-slate-900">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 -ml-1 rounded-full hover:bg-white/10 text-white/70">
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <h2 className="text-white text-base font-black">إعدادات المشرفين</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70">
          <X size={18} />
        </button>
      </div>

      {/* ===== Tabs ===== */}
      <div className="flex border-b border-white/10 bg-slate-900 flex-shrink-0">
        {[
          { key: "list" as Tab, label: "القائمة" },
          { key: "permissions" as Tab, label: "الأذونات" },
          { key: "logs" as Tab, label: "سجلات" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-black transition relative ${
              tab === t.key ? "text-emerald-400" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 overflow-y-auto bg-slate-950">
        {/* ===== LIST ===== */}
        {tab === "list" && (
          <div className="p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="البحث عن الادمن (الإسم -ID)"
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pr-10 pl-4 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Count card */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-900/40 via-amber-800/40 to-amber-900/40 border border-amber-500/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-black">أدمن الشرف</p>
                  <p className="text-white/60 text-[10px]">احصل على المزيد من الادمن</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-xs font-black">الأدمن: <span className="text-emerald-400">{mods.length}/100</span></p>
                <p className="text-white/60 text-[10px]">الأدمن المميز: 0/2</p>
              </div>
            </div>

            {/* Mods list */}
            {mods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/40">
                <Shield size={48} className="mb-3 opacity-30" />
                <p className="text-sm">لا يوجد مشرفون بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mods.map((m: any) => (
                  <div key={m._id} className="rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-black">{m.name?.[0] || "?"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{m.name}</p>
                      <p className="text-white/40 text-[10px]" dir="ltr">ID:{m.userNumber ?? "—"}</p>
                    </div>
                    <span className="text-sky-300 text-[10px] font-black px-2 py-1 rounded-full bg-sky-500/20 border border-sky-400/30">مشرف</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== PERMISSIONS ===== */}
        {tab === "permissions" && (
          <div className="p-4 space-y-2">
            {permissions === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-white/40" />
              </div>
            ) : (
              <>
                {PERMISSION_LABELS.map((p) => {
                  const Icon = p.icon;
                  const value = (permissions as any)[p.key] ?? false;
                  return (
                    <div
                      key={p.key}
                      className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${value ? "bg-emerald-500/20" : "bg-white/5"}`}>
                        <Icon size={16} className={value ? "text-emerald-300" : "text-white/40"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold">{p.label}</p>
                        {p.desc && <p className="text-white/40 text-[10px] mt-0.5">{p.desc}</p>}
                      </div>
                      <button
                        disabled={busy}
                        onClick={() => handleToggle(p.key, !value)}
                        className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${value ? "bg-emerald-500" : "bg-white/15"}`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${value ? "right-0.5" : "right-[22px]"}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ===== LOGS ===== */}
        {tab === "logs" && (
          <div className="p-4">
            <p className="text-white/50 text-xs text-center mb-4">
              سجلات عمليات السوبر أدمن، تحتفظ فقط بسجلات آخر 15 يوماً
            </p>
            <div className="flex flex-col items-center justify-center py-16 text-white/40">
              <History size={48} className="mb-3 opacity-30" />
              <p className="text-sm">لا توجد سجلات</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
