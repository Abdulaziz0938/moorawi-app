import { useState } from "react";
import { dialog } from "../lib/dialog";
import IconOrImage from "./IconOrImage";
import {
  Crown, Gem, Handshake, Award, Wallet, Star, Mic, Briefcase,
  ShoppingBag, CheckSquare, ShieldCheck, Clock, Headphones,
  Globe, Settings, ChevronLeft, Sparkles, LogOut, Gift,
} from "lucide-react";

interface Props {
  onOpenWallet: () => void;
  onOpenGiftHistory?: () => void;
  onOpenStore?: () => void;
  onOpenMissions?: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onOpenVip?: () => void;
  onOpenHost?: () => void;
  onOpenAgency?: () => void;
  onOpenVisits?: () => void;
  onOpenSupport?: () => void;
  onOpenVerify?: () => void;
  onOpenRelations?: () => void;
  onOpenLevel?: () => void;
  onOpenSupporter?: () => void;
  onOpenLegend?: () => void;
  onOpenSupporterVip?: () => void;
  onOpenLanguage?: () => void;
  onLogout?: () => void;
  onOpenMedals?: () => void;
  onOpenAgentPanel?: () => void;
  isRechargeAgent?: boolean;
  isOwner?: boolean;
}

export default function ServicesSection({
  onOpenWallet,
  onOpenGiftHistory,
  onOpenStore,
  onOpenMissions,
  onOpenSettings,
  onOpenAdmin,
  onOpenVip,
  onOpenHost,
  onOpenAgency,
  onOpenVisits,
  onOpenSupport,
  onOpenVerify,
  onOpenRelations,
  onOpenLevel,
  onOpenSupporter,
  onOpenLegend,
  onOpenSupporterVip,
  onOpenLanguage,
  onLogout,
  onOpenMedals,
  onOpenAgentPanel,
  isRechargeAgent,
  isOwner,
}: Props) {
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const soon = (name: string) => setInfoModal(name);

  // ============ Top: VIP + الداعم المحترم ============
  const topCards = [
    {
      key: "supporter",
      assetKey: "ui.service.supporter",
      label: "الداعم المحترم",
      sub: "S5 → S100",
      icon: Gem,
      gradient: "from-amber-700/40 to-amber-900/40",
      border: "border-amber-500/30",
      onClick: onOpenSupporter ?? (() => soon("الداعم المحترم")),
    },
    {
      key: "vip",
      assetKey: "ui.service.vip",
      label: "VIP",
      sub: "1 → 7",
      icon: Crown,
      gradient: "from-purple-700/40 to-purple-900/40",
      border: "border-purple-500/30",
      onClick: onOpenVip ?? (() => soon("VIP")),
    },
  ];

  // ============ Middle grid: 8 buttons ============
  const gridItems = [
    { key: "relation",      assetKey: "ui.service.relation", label: "العلاقة",   icon: Handshake,  color: "text-rose-300",     onClick: onOpenRelations ?? (() => soon("العلاقة")) },
    { key: "level",      assetKey: "ui.service.level",    label: "مستوى",      icon: Sparkles,   color: "text-amber-300",    onClick: onOpenLevel ?? (() => soon("المستوى")) },
    { key: "medals",      assetKey: "ui.service.medals",   label: "أوسمة",      icon: Award,      color: "text-yellow-300",   onClick: onOpenMedals ?? (() => soon("الأوسمة")) },
    { key: "wallet",      assetKey: "ui.service.wallet",   label: "محفظة",      icon: Wallet,     color: "text-emerald-300",  onClick: onOpenWallet },
    { key: "giftHistory", assetKey: "ui.service.giftHistory", label: "سجل الهدايا", icon: Gift,    color: "text-pink-300",     onClick: onOpenGiftHistory ?? (() => soon("سجل الهدايا")) },
    { key: "legend",      assetKey: "ui.service.legend",   label: "الأسطورة",   icon: Star,       color: "text-fuchsia-300",  onClick: onOpenLegend ?? (() => soon("الأسطورة")) },
    { key: "host",      assetKey: "ui.service.host",     label: "مضيف",       icon: Mic,        color: "text-sky-300",      onClick: onOpenHost ?? (() => soon("المضيف")) },
    { key: "agency",      assetKey: "ui.service.agency",   label: "وكالة",      icon: Briefcase,  color: "text-teal-300",     onClick: onOpenAgency ?? (() => soon("الوكالة")) },
    { key: "store",      assetKey: "ui.service.store",    label: "متجر",       icon: ShoppingBag, color: "text-pink-300",    onClick: onOpenStore ?? (() => soon("المتجر")) },
  ];

  // ============ Bottom list: 7 rows ============
  const listItems = [
    { key: "missions",      assetKey: "ui.service.missions",   label: "مهام",                     icon: CheckSquare,  color: "text-emerald-300", onClick: onOpenMissions ?? (() => soon("المهام")) },
    { key: "vipSupport",      assetKey: "ui.service.support", label: "VIP خاصة بالداعمين",       icon: Crown,        color: "text-purple-300",  onClick: onOpenSupporterVip ?? (() => soon("VIP خاصة بالداعمين")) },
    { key: "verify",      assetKey: "ui.service.verify",     label: "المصادقة",                 icon: ShieldCheck,  color: "text-blue-300",    onClick: onOpenVerify ?? (() => soon("المصادقة")) },
    { key: "visits",      assetKey: "ui.service.visits",     label: "الزيارات الأخيرة",         icon: Clock,        color: "text-cyan-300",    onClick: onOpenVisits ?? (() => soon("الزيارات الأخيرة")) },
    { key: "support",      assetKey: "ui.service.support",    label: "خدمة عملاء",               icon: Headphones,   color: "text-indigo-300",  onClick: onOpenSupport ?? (() => soon("خدمة العملاء")) },
    { key: "language",      assetKey: "ui.service.language",   label: "اللغة",                    icon: Globe,        color: "text-pink-300",    onClick: onOpenLanguage ?? (() => soon("اللغة")) },
    { key: "settings",      assetKey: "ui.service.settings",   label: "إعدادات",                  icon: Settings,     color: "text-white/70",    onClick: onOpenSettings ?? (() => soon("الإعدادات")) },
  ];

  return (
    <div className="mx-4 mt-5 space-y-4">
      {/* ============ ADMIN BUTTON (owner only) ============ */}
      {isOwner && onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          className="w-full rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-600/30 to-orange-600/30 p-3 flex items-center justify-between active:scale-95 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Crown size={20} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-white text-sm font-black">لوحة المالك</p>
              <p className="text-white/50 text-[10px]">إدارة المستخدمين والمتجر</p>
            </div>
          </div>
          <ChevronLeft size={20} className="text-white/50" />
        </button>
      )}

      {/* ============ TOP CARDS ============ */}
      <div className="grid grid-cols-2 gap-3">
        {topCards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={c.onClick}
              className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.gradient} p-2 flex flex-col items-center active:scale-95 transition`}
            >
              <div className="w-full aspect-square max-h-28 flex items-center justify-center">
                <IconOrImage assetKey={c.assetKey} Icon={Icon} size={32} imgSize={72} fillParent className="text-amber-200" fill="currentColor" strokeWidth={1.5} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ============ 8-GRID ============ */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 grid grid-cols-4 gap-2">
        {gridItems.map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.key}
              onClick={g.onClick}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-white/10 active:scale-95 transition"
            >
              <div className="w-full aspect-square flex items-center justify-center">
                <IconOrImage assetKey={g.assetKey} Icon={Icon} size={26} imgSize={64} fillParent className={g.color} strokeWidth={1.8} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ============ BOTTOM LIST ============ */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden">
        {listItems.map((it, idx) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition ${
                idx !== listItems.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full bg-white/10 flex items-center justify-center ${it.color}`}>
                  <IconOrImage assetKey={it.assetKey} Icon={Icon} size={16} imgSize={44} strokeWidth={2} />
                </div>
                <span className="text-white text-sm font-bold">{it.label}</span>
              </div>
              <ChevronLeft size={18} className="text-white/40" />
            </button>
          );
        })}
      </div>

      {/* ============ LOGOUT ============ */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex items-center justify-center gap-2 text-red-300 text-sm font-black hover:bg-red-500/20 active:scale-95 transition"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      )}
          {/* [ezo-agents] زر لوحة وكيل الشحن — يظهر فقط للوكلاء */}
      {isRechargeAgent && onOpenAgentPanel && (
        <button
          onClick={onOpenAgentPanel}
          className="w-full mt-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center gap-3 text-right active:scale-95 transition shadow-lg"
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-black">لوحة وكيل الشحن</p>
            <p className="text-white/70 text-[10px] mt-0.5">أرسل عملات، راقب الرصيد والسجل</p>
          </div>
          <ChevronLeft size={18} className="text-white/70" />
        </button>
      )}

</div>
  );
}
