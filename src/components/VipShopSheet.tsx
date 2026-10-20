// [ezo-vip] Ezo-Style Exact Replica VIP & Queen Shop
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { useAssets } from "../lib/assets";
import { dialog } from "../lib/dialog";
import {
  ArrowRight, HelpCircle, Crown, Coins, Loader2, Sparkles,
  Gift, Star, Eye, Heart, Percent, TrendingUp, MessageCircle,
  Zap, ShoppingBag, Wand2, Award, Ban, Ghost, IdCard, Share2,
  Megaphone, ShieldOff, BadgeCheck, Users, Mic, UserCircle,
  Car, Home, AudioLines, MicVocal, Bell, Music, Palette,
  LayoutGrid, Type, Gem, ScrollText, Shield, Trophy,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onOpenRecharge?: () => void;
}

const ICONS: Record<string, any> = {
  Gift, Star, Coins, Eye, Heart, Percent, TrendingUp, MessageCircle,
  Zap, ShoppingBag, Wand2, Award, Ban, Ghost, IdCard, Share2,
  Megaphone, ShieldOff, BadgeCheck, Users, Mic, UserCircle,
  Car, Home, AudioLines, MicVocal, Bell, Music, Palette, LayoutGrid,
  Type, Gem, ScrollText, Shield, Sparkles, Trophy, Crown,
};

// ثيمات الألوان المطابقة لصور Ezo بالبكسل لكل مستوى
const EZO_VIP_THEMES: Record<number, {
  bgGrad: string;
  cardBg: string;
  cardBorder: string;
  tabTextGrad: string;
  nickGrad: string;
  accent: string;
  benefitCount: number;
}> = {
  1: {
    bgGrad: "linear-gradient(180deg, #0b1c14 0%, #072617 45%, #04140c 100%)",
    cardBg: "rgba(10, 42, 26, 0.75)",
    cardBorder: "rgba(52, 211, 153, 0.35)",
    tabTextGrad: "linear-gradient(180deg, #ffffff 0%, #a7f3d0 100%)",
    nickGrad: "linear-gradient(90deg, #6ee7b7, #fde047)",
    accent: "#34d399",
    benefitCount: 14,
  },
  2: {
    bgGrad: "linear-gradient(180deg, #091326 0%, #0b1d3d 45%, #050c1a 100%)",
    cardBg: "rgba(12, 28, 62, 0.75)",
    cardBorder: "rgba(96, 165, 250, 0.4)",
    tabTextGrad: "linear-gradient(180deg, #ffffff 0%, #93c5fd 100%)",
    nickGrad: "linear-gradient(90deg, #60a5fa, #fde68a)",
    accent: "#60a5fa",
    benefitCount: 16,
  },
  3: {
    bgGrad: "linear-gradient(180deg, #1b0a2e 0%, #270e45 45%, #11051f 100%)",
    cardBg: "rgba(42, 14, 74, 0.75)",
    cardBorder: "rgba(192, 132, 252, 0.4)",
    tabTextGrad: "linear-gradient(180deg, #ffffff 0%, #e9d5ff 100%)",
    nickGrad: "linear-gradient(90deg, #c084fc, #fde68a)",
    accent: "#c084fc",
    benefitCount: 18,
  },
  4: {
    bgGrad: "linear-gradient(180deg, #2b0b0e 0%, #3d0f14 45%, #1a0608 100%)",
    cardBg: "rgba(65, 16, 22, 0.78)",
    cardBorder: "rgba(248, 113, 113, 0.38)",
    tabTextGrad: "linear-gradient(180deg, #fde68a 0%, #fca5a5 100%)",
    nickGrad: "linear-gradient(90deg, #f87171, #fde68a)",
    accent: "#f87171",
    benefitCount: 22,
  },
  5: {
    bgGrad: "linear-gradient(180deg, #14120e 0%, #1c1810 45%, #0c0a08 100%)",
    cardBg: "rgba(28, 25, 20, 0.85)",
    cardBorder: "rgba(212, 175, 55, 0.38)",
    tabTextGrad: "linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)",
    nickGrad: "linear-gradient(90deg, #fef08a, #f59e0b)",
    accent: "#fbbf24",
    benefitCount: 28,
  },
  6: {
    bgGrad: "linear-gradient(180deg, #291d06 0%, #422f08 45%, #1f1604 100%)",
    cardBg: "rgba(68, 48, 10, 0.78)",
    cardBorder: "rgba(251, 191, 36, 0.45)",
    tabTextGrad: "linear-gradient(180deg, #fde047 0%, #f97316 100%)",
    nickGrad: "linear-gradient(90deg, #fef08a, #f59e0b)",
    accent: "#f59e0b",
    benefitCount: 31,
  },
  7: {
    bgGrad: "linear-gradient(180deg, #26120c 0%, #381911 45%, #1c0c08 100%)",
    cardBg: "rgba(58, 26, 18, 0.8)",
    cardBorder: "rgba(234, 179, 8, 0.5)",
    tabTextGrad: "linear-gradient(180deg, #fde047 0%, #ef4444 60%, #ec4899 100%)",
    nickGrad: "linear-gradient(90deg, #3b82f6, #ec4899, #fde047)",
    accent: "#eab308",
    benefitCount: 40,
  },
};

// الميزات الحصرية الدائرية لكل مستوى (مطابقة لصور Ezo)
const EXCLUSIVE_CIRCLES: Record<number, { icon: string; label: string }[]> = {
  1: [
    { icon: "Gift", label: "هدايا VIP الحصرية" },
    { icon: "Type", label: "الاسم ذهبي" },
    { icon: "Coins", label: "عملات يومية" },
    { icon: "Wand2", label: "تصميم تأثير الدخول" },
  ],
  2: [
    { icon: "IdCard", label: "شراء ايدي مميز" },
    { icon: "Share2", label: "شارك ال VIP الخاص بك" },
    { icon: "Ghost", label: "تخفي" },
    { icon: "ShoppingBag", label: "خصم المتجر" },
  ],
  3: [
    { icon: "Megaphone", label: "إعلان المنصة" },
    { icon: "ShieldOff", label: "تجنب الطرد" },
    { icon: "IdCard", label: "شراء ايدي مميز" },
    { icon: "Share2", label: "شارك ال VIP الخاص بك" },
  ],
  4: [
    { icon: "Users", label: "الشخص الغامض" },
    { icon: "UserCircle", label: "ديكور الرجل الغامض" },
    { icon: "Mic", label: "تغيير الصوت الحصري" },
    { icon: "BadgeCheck", label: "شراء امتيازات VIP" },
  ],
  5: [
    { icon: "ShieldOff", label: "تجنب الطرد" },
    { icon: "Share2", label: "شارك ال VIP الخاص بك" },
  ],
  6: [
    { icon: "Users", label: "الشخص الغامض" },
    { icon: "UserCircle", label: "ديكور الرجل الغامض" },
    { icon: "Mic", label: "تغيير الصوت الحصري" },
    { icon: "Car", label: "المركبة الحصرية" },
  ],
  7: [
    { icon: "Gift", label: "شريط هدايا حصري" },
    { icon: "Music", label: "استخدام الميكروفون مجاناً" },
    { icon: "LayoutGrid", label: "تخطيط الغرفة" },
    { icon: "Car", label: "المركبة الحصرية" },
  ],
};

// فاصل Ezo الزخرفي مع النجمة الرباعية والخط الذهبي المتلاشي
function EzoDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 my-4 px-6 select-none">
      <div className="h-[1px] flex-1 max-w-[75px] bg-gradient-to-l from-[#e5c17b] to-transparent opacity-80" />
      <span className="text-[#e5c17b] text-[10px] leading-none">✦</span>
      <span className="text-[#f5deb3] text-[15px] font-bold tracking-wide">{title}</span>
      <span className="text-[#e5c17b] text-[10px] leading-none">✦</span>
      <div className="h-[1px] flex-1 max-w-[75px] bg-gradient-to-r from-[#e5c17b] to-transparent opacity-80" />
    </div>
  );
}

export default function VipShopSheet({ onClose, onOpenRecharge }: Props) {
  const token = getActiveToken();
  const assets = useAssets();
  const data = useQuery(api.vip.myVip, { tokenOverride: token });
  const allBenefits = useQuery(api.vip.getAllBenefits);
  const balance = useQuery(api.wallet.balance, { tokenOverride: token });
  const buyVip = useMutation(api.vip.buyVip);

  const [mainTab, setMainTab] = useState<"queen" | "vip" | "special">("vip");
  const [selected, setSelected] = useState<number>(6);
  const [busy, setBusy] = useState(false);

  const plans = data?.plans ?? [];
  const currentLevel = data?.level ?? 0;
  const active = data?.active ?? false;
  const coins = balance?.coins ?? 0;

  const plan = plans.find((p) => p.level === selected) ?? {
    level: selected,
    name: `VIP ${selected}`,
    priceCoins: selected === 1 ? 24000 : selected === 2 ? 60000 : selected === 3 ? 240000 : selected === 4 ? 599998 : null,
    exclusive: selected >= 5,
  };

  const theme = EZO_VIP_THEMES[selected] ?? EZO_VIP_THEMES[1];

  // تجميع كل المزايا الفريدة بالترتيب لجدول المقارنة السفلي
  const tableRows = useMemo(() => {
    const list = allBenefits ?? [];
    const byLevel: Record<number, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set(), 7: new Set() };
    const uniqueItems: { icon: string; textAr: string; order: number }[] = [];
    const seen = new Set<string>();

    for (const b of list) {
      if (byLevel[b.level]) byLevel[b.level].add(b.textAr);
      if (!seen.has(b.textAr)) {
        seen.add(b.textAr);
        uniqueItems.push({ icon: b.icon, textAr: b.textAr, order: b.order });
      }
    }
    return { uniqueItems, byLevel };
  }, [allBenefits]);

  // تحديد الأعمدة الثلاثة المعروضة في جدول المقارنة بحيث يكون المستوى المختار دائماً واضحاً ومُحاطاً بالإطار الذهبي
  const visibleTableLevels = useMemo(() => {
    if (selected <= 2) return [1, 2, 3];
    if (selected >= 6) return [5, 6, 7];
    return [selected - 1, selected, selected + 1];
  }, [selected]);

  const handleBuy = () => {
    if (!plan) return;
    if (plan.exclusive || selected >= 5) {
      if (onOpenRecharge) {
        onClose();
        onOpenRecharge();
        return;
      }
      dialog.alert("هذا المستوى يُحصل عليه عبر مكافآت إعادة الشحن الشهرية");
      return;
    }
    const price = plan.priceCoins ?? 0;
    if (coins < price) {
      dialog.alert(`تحتاج ${price.toLocaleString()} عملة — رصيدك ${coins.toLocaleString()}`);
      return;
    }
    dialog.confirm(
      `شراء ${plan.name} بمبلغ ${price.toLocaleString()} عملة لمدة 30 يوماً؟`,
      async () => {
        setBusy(true);
        try {
          await buyVip({ level: selected, tokenOverride: token });
          dialog.alert(`تم تفعيل ${plan.name} لمدة 30 يوماً بنجاح!`);
        } catch (e: any) {
          dialog.alert(e?.message || "فشل الشراء");
        } finally {
          setBusy(false);
        }
      },
      plan.name,
      "شراء"
    );
  };

  // البطاقات الـ 9 (أو 8 للمستويات 1-4 كما في Ezo)
  const renderVipGrid = () => {
    const isHighTier = selected >= 5;
    // في المستويات 1-4 هناك 8 مربعات (الصف الثالث فيه مربعان عريضان: wave و bubble)
    // في المستويات 5-7 هناك 9 مربعات (الصف الثالث فيه 3 مربعات: entry و wave و bubble)
    const topSix = [
      { key: "logo", label: "الشعار" },
      { key: "medal", label: "الميدالية" },
      { key: "frame", label: "الإطار" },
      { key: "halo", label: "الهالة" },
      { key: "card", label: "البطاقة" },
      { key: "nickname", label: "NICKNAME" },
    ];

    const bottomRow = isHighTier
      ? [
          { key: "bubble", label: "الفقاعات", span: "col-span-2" },
          { key: "wave", label: "الموجة", span: "col-span-2" },
          { key: "entry", label: "خلفية البروفايل", span: "col-span-2" },
        ]
      : [
          { key: "bubble", label: "الفقاعات", span: "col-span-3" },
          { key: "wave", label: "الموجة", span: "col-span-3" },
        ];

    const renderSlotCard = (slot: { key: string; label: string; span?: string }) => {
      const url = assets[`vip.${slot.key}.${selected}`];
      return (
        <div
          key={slot.key}
          className={`${slot.span || "col-span-2"} aspect-square rounded-xl flex items-center justify-center p-2 relative overflow-hidden transition-transform active:scale-95`}
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: "inset 0 0 18px rgba(0,0,0,0.45)",
          }}
        >
          {url ? (
            <img
              src={url}
              alt={slot.label}
              className="max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]"
              draggable={false}
            />
          ) : slot.key === "nickname" ? (
            <span
              className="font-black text-xs sm:text-sm tracking-wider select-none"
              style={{
                background: theme.nickGrad,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))",
              }}
              dir="ltr"
            >
              NICKNAME
            </span>
          ) : slot.key === "logo" ? (
            <div className="flex flex-col items-center justify-center">
              <div
                className="px-3 py-1 rounded-lg border font-black italic text-sm tracking-wider shadow-lg"
                style={{
                  borderColor: theme.accent,
                  background: "linear-gradient(135deg, rgba(0,0,0,0.8), rgba(255,255,255,0.1))",
                  color: "#fde68a",
                  textShadow: `0 0 10px ${theme.accent}`,
                }}
                dir="ltr"
              >
                VIP{selected}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 opacity-85">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border"
                style={{
                  borderColor: theme.cardBorder,
                  background: `radial-gradient(circle, ${theme.accent}30 0%, transparent 70%)`,
                }}
              >
                <Crown size={24} style={{ color: theme.accent }} />
              </div>
              <span className="text-[#f5deb3]/70 text-[10px] font-bold">{slot.label}</span>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="mx-3 grid grid-cols-6 gap-2.5" dir="ltr">
        {topSix.map(renderSlotCard)}
        {bottomRow.map((item) => (
          <div
            key={item.key}
            className={`${item.span} ${isHighTier ? "aspect-square" : "aspect-[1.45/1]"} rounded-xl flex items-center justify-center p-2 relative overflow-hidden`}
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: "inset 0 0 18px rgba(0,0,0,0.45)",
            }}
          >
            {assets[`vip.${item.key}.${selected}`] ? (
              <img
                src={assets[`vip.${item.key}.${selected}`]}
                alt={item.label}
                className="max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 opacity-80">
                <Sparkles size={22} style={{ color: theme.accent }} />
                <span className="text-[#f5deb3]/70 text-[10px] font-bold">{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden select-none"
      style={{
        background: mainTab === "queen"
          ? "linear-gradient(180deg, #1a040a 0%, #2e0714 40%, #120206 100%)"
          : theme.bgGrad,
      }}
      dir="rtl"
    >
      {/* ===== 1. شريط التبويبات العلوي الرئيسي (الملكة | VIP | الخاص) ===== */}
      <div className="bg-[#171512]/95 border-b border-white/5 px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0 z-20">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-white/90 active:scale-90 transition"
        >
          <ArrowRight size={22} />
        </button>

        <div className="flex items-center gap-7">
          <button
            onClick={() => setMainTab("queen")}
            className={`relative pb-1.5 text-[15px] font-bold transition ${
              mainTab === "queen" ? "text-white font-black" : "text-white/55"
            }`}
          >
            الملكة
            {mainTab === "queen" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2.5px] rounded-full bg-white" />
            )}
          </button>

          <button
            onClick={() => setMainTab("vip")}
            className={`relative pb-1.5 text-[15px] font-bold transition ${
              mainTab === "vip" ? "text-white font-black" : "text-white/55"
            }`}
          >
            VIP
            {mainTab === "vip" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2.5px] rounded-full bg-white" />
            )}
          </button>

          <button
            onClick={() => setMainTab("special")}
            className={`relative pb-1.5 text-[15px] font-bold transition ${
              mainTab === "special" ? "text-white font-black" : "text-white/55"
            }`}
          >
            الخاص
            {mainTab === "special" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2.5px] rounded-full bg-white" />
            )}
          </button>
        </div>

        <button
          onClick={() => dialog.alert("نظام امتيازات VIP يمنحك ألقاباً وإطارات وحصانة حصرية لمدة 30 يوماً.")}
          className="w-8 h-8 flex items-center justify-center text-white/80 active:scale-90 transition"
        >
          <HelpCircle size={20} />
        </button>
      </div>

      {/* ===== 2. شريط مستويات VIP1 .. VIP7 (يظهر في تبويب VIP) ===== */}
      {mainTab === "vip" && (
        <div
          className="bg-[#1c1915]/95 px-2 py-2.5 flex items-center justify-between border-b border-white/5 flex-shrink-0 z-20"
          dir="ltr"
        >
          {[7, 6, 5, 4, 3, 2, 1].map((lvl) => {
            const isSel = lvl === selected;
            const t = EZO_VIP_THEMES[lvl];
            return (
              <button
                key={lvl}
                onClick={() => setSelected(lvl)}
                className="flex-1 text-center transition-all duration-200 active:scale-95"
              >
                <span
                  className={
                    isSel
                      ? "text-[17px] font-black italic tracking-tight drop-shadow-[0_2px_8px_rgba(250,204,21,0.45)]"
                      : "text-[12px] font-semibold text-white/50"
                  }
                  style={
                    isSel
                      ? {
                          background: t.tabTextGrad,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }
                      : undefined
                  }
                >
                  VIP {lvl}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== 3. المحتوى القابل للتمرير ===== */}
      <div className="flex-1 overflow-y-auto pb-28">
        {mainTab === "queen" ? (
          /* ================= واجهة الملكة (Ezo Queen) ================= */
          <div className="flex flex-col">
            {/* البانر العلوي للملكة */}
            <div className="relative h-64 flex flex-col items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  background: "radial-gradient(circle at 50% 45%, #e11d48 0%, transparent 70%)",
                }}
              />
              {/* زر الداعمين في الزاوية اليسرى العلوية كما في الصورة */}
              <div className="absolute top-4 left-4 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-500/30 to-black/60 border border-rose-300/40 flex items-center justify-center shadow-lg">
                  <Gift size={28} className="text-rose-200" />
                </div>
                <span className="text-[11px] font-black text-rose-100 -mt-1.5 drop-shadow">الداعمين</span>
              </div>

              {/* شعار الملكة المركزي */}
              {assets["vip.queen.hero"] ? (
                <img
                  src={assets["vip.queen.hero"]}
                  alt="Queen"
                  className="h-48 object-contain relative z-10 drop-shadow-[0_10px_25px_rgba(225,29,72,0.5)]"
                />
              ) : (
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full border-2 border-rose-300/60 bg-gradient-to-b from-rose-900/60 to-black/80 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.6)]">
                    <Crown size={58} className="text-rose-300 drop-shadow" fill="rgba(253,164,175,0.35)" />
                    <span className="font-serif italic font-black text-2xl text-rose-200 tracking-wider -mt-1" dir="ltr">
                      Queen
                    </span>
                  </div>
                </div>
              )}
            </div>

            <EzoDivider title="28 امتيازات" />

            {/* شبكة الـ 6 مربعات الخاصة بالملكة */}
            <div className="mx-3 grid grid-cols-3 gap-2.5" dir="ltr">
              {[
                { key: "queen.badge", label: "Queen" },
                { key: "queen.halo", label: "هالة الملكة" },
                { key: "queen.frame", label: "إطار الملكة" },
                { key: "queen.entry", label: "خلفية الملكة" },
                { key: "queen.card", label: "بطاقة الملكة" },
                { key: "queen.wave", label: "موجة الملكة" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="aspect-square rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
                  style={{
                    background: "rgba(76, 15, 34, 0.65)",
                    border: "1px solid rgba(244, 114, 182, 0.35)",
                  }}
                >
                  {assets[item.key] ? (
                    <img src={assets[item.key]} alt={item.label} className="max-h-[85%] max-w-[85%] object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Crown size={26} className="text-rose-300" />
                      <span className="text-rose-100/80 text-[10px] font-bold">{item.label}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* الـ 4 دوائر السفلية للملكة */}
            <div className="grid grid-cols-4 gap-2 px-3 mt-6">
              {[
                { icon: Palette, label: "خلفية الغرفة" },
                { icon: Mic, label: "ديكور المايك" },
                { icon: Type, label: "لقب بلون وردي متدرج جميل" },
                { icon: TrendingUp, label: "مستوى الجاذبية" },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#3d2c2e] to-[#1f1617] border border-[#e5c17b]/30 flex items-center justify-center shadow-inner">
                      <Icon size={24} className="text-[#f5deb3]" />
                    </div>
                    <span className="text-[#d6c7b2] text-[11px] font-semibold leading-tight">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : mainTab === "special" ? (
          /* ================= تبويب الخاص ================= */
          <div className="p-8 text-center text-[#f5deb3]/70 flex flex-col items-center justify-center h-96 gap-3">
            <Sparkles size={42} className="text-[#e5c17b]" />
            <p className="text-base font-bold text-white">الامتيازات الخاصة</p>
            <p className="text-xs text-white/50">تتوفر قريباً في الفعاليات الموسمية الخاصة</p>
          </div>
        ) : (
          /* ================= واجهة VIP الرئيسية (VIP 1 .. VIP 7) ================= */
          <>
            {/* الشعار العلوي الغاطس في الخلفية (يظهر جزئياً كما في صور VIP 1-4) */}
            {assets[`vip.hero.${selected}`] && (
              <div className="relative h-24 overflow-hidden flex items-center justify-center pointer-events-none">
                <img
                  src={assets[`vip.hero.${selected}`]}
                  alt=""
                  className="w-44 object-contain opacity-85 -mt-6 drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
                />
              </div>
            )}

            {/* فاصل عدد الامتيازات */}
            <EzoDivider title={`${theme.benefitCount} امتيازات`} />

            {/* شبكة الـ 8 أو 9 مربعات */}
            {renderVipGrid()}

            {/* قسم: حصرياً لـ VIP X */}
            <EzoDivider title={`حصرياً لـ VIP${selected}`} />

            <div className="flex items-start justify-center gap-4 px-3 my-2 flex-wrap">
              {(EXCLUSIVE_CIRCLES[selected] ?? EXCLUSIVE_CIRCLES[6]).map((item, idx) => {
                const Icon = ICONS[item.icon] ?? Crown;
                return (
                  <div key={idx} className="flex flex-col items-center text-center w-[76px] gap-2">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center border shadow-lg"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, rgba(229,193,123,0.28), rgba(20,16,12,0.85))",
                        borderColor: "rgba(229, 193, 123, 0.35)",
                      }}
                    >
                      <Icon size={24} className="text-[#f5deb3]" />
                    </div>
                    <span className="text-[#d6c7b2] text-[11px] font-medium leading-snug">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* قسم: جدول مقارنة امتيازات VIP الكامل (كما في الصور 8 و 9) */}
            <EzoDivider title="امتيازات VIP" />

            <div className="mx-3 mt-2 rounded-2xl overflow-hidden border border-[#e5c17b]/20 bg-black/40">
              {/* رأس الجدول */}
              <div className="grid grid-cols-10 items-center bg-black/50 border-b border-white/10">
                {/* عمود الأيقونة الأيمن */}
                <div className="col-span-1 py-3 flex items-center justify-center border-l border-white/5">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <Crown size={14} className="text-[#f5deb3]" />
                  </div>
                </div>
                {/* أعمدة المستويات الثلاثة */}
                {visibleTableLevels.map((lvl) => {
                  const isCurrent = lvl === selected;
                  return (
                    <div
                      key={lvl}
                      onClick={() => setSelected(lvl)}
                      className={`col-span-3 py-3 flex items-center justify-center cursor-pointer transition ${
                        isCurrent
                          ? "bg-[#2b1f14]/90 border-t-2 border-x-2 border-[#e5c17b] rounded-t-xl"
                          : "opacity-75"
                      }`}
                    >
                      <span
                        className="px-2.5 py-0.5 rounded text-xs font-black italic tracking-wider border"
                        style={{
                          borderColor: EZO_VIP_THEMES[lvl].accent,
                          color: "#fde68a",
                          background: "rgba(0,0,0,0.6)",
                        }}
                        dir="ltr"
                      >
                        VIP{lvl}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* صفوف المزايا */}
              <div className="divide-y divide-white/5">
                {tableRows.uniqueItems.map((row, idx) => {
                  const Icon = ICONS[row.icon] ?? Sparkles;
                  return (
                    <div key={idx} className="grid grid-cols-10 items-stretch text-center min-h-[52px]">
                      {/* الأيقونة على اليمين */}
                      <div className="col-span-1 flex items-center justify-center bg-black/30 border-l border-white/5 py-2">
                        <div className="w-8 h-8 rounded-full bg-[#38291e]/80 border border-[#e5c17b]/25 flex items-center justify-center">
                          <Icon size={15} className="text-[#f5deb3]" />
                        </div>
                      </div>

                      {/* الخلايا الثلاث للمستويات */}
                      {visibleTableLevels.map((lvl) => {
                        const hasFeature = tableRows.byLevel[lvl]?.has(row.textAr);
                        const isCurrent = lvl === selected;
                        return (
                          <div
                            key={lvl}
                            className={`col-span-3 flex items-center justify-center px-1.5 py-2 text-[11px] font-bold leading-tight ${
                              isCurrent
                                ? "bg-[#2b1f14]/60 border-x-2 border-[#e5c17b] text-white"
                                : "text-white/75"
                            }`}
                          >
                            {hasFeature ? (
                              <span>{row.textAr}</span>
                            ) : (
                              <span className="text-white/25 font-black text-base">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== 4. الشريط السفلي الثابت (مطابق لـ Ezo) ===== */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-r from-[#24180b] via-[#33220f] to-[#1f150a] border-t border-[#e5c17b]/30 px-4 py-3 flex items-center justify-between shadow-[0_-8px_25px_rgba(0,0,0,0.8)]">
        {mainTab === "queen" ? (
          <>
            {/* يمين الشريط في الملكة: السعر + 30 يوما */}
            <div className="flex items-baseline gap-2">
              <div className="flex items-center gap-1.5" dir="ltr">
                <span className="text-white text-2xl font-black tracking-tight tabular-nums">6,000,000</span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 flex items-center justify-center text-amber-950 font-black text-xs shadow">
                  B
                </div>
              </div>
              <span className="text-white/60 text-xs font-medium">30 يوما</span>
            </div>

            {/* يسار الشريط في الملكة: زر إرسال */}
            <button
              onClick={() => dialog.alert("إرسال لقب الملكة يتطلب 6,000,000 عملة")}
              className="px-8 py-2.5 rounded-full bg-gradient-to-r from-[#f6d386] to-[#eab354] text-[#3b2306] font-black text-base flex items-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Gift size={18} className="text-[#593508]" />
              <span>إرسال</span>
            </button>
          </>
        ) : selected >= 5 || plan.exclusive ? (
          <>
            {/* يمين الشريط لـ VIP 5-7: نص مكافآت إعادة الشحن الشهرية */}
            <span className="text-[#c7b69e] text-xs sm:text-sm font-semibold">
              فقط لمكافآت إعادة الشحن الشهرية
            </span>

            {/* يسار الشريط لـ VIP 5-7: زر شحن */}
            <button
              onClick={handleBuy}
              className="px-9 py-2.5 rounded-full bg-gradient-to-r from-[#f6d386] to-[#eab354] text-[#3b2306] font-black text-base shadow-lg active:scale-95 transition"
            >
              شحن
            </button>
          </>
        ) : (
          <>
            {/* يمين الشريط لـ VIP 1-4: السعر بالعملات + 30 يوما */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5" dir="ltr">
                <span className="text-white text-2xl font-black tracking-tight tabular-nums">
                  {(plan.priceCoins ?? 0).toLocaleString()}
                </span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 flex items-center justify-center text-amber-950 font-black text-xs shadow">
                  B
                </div>
              </div>
              <span className="text-white/60 text-[11px] -mt-0.5">30 يوما</span>
            </div>

            {/* يسار الشريط لـ VIP 1-4: زر الإهداء الدائري + زر اشتري الآن */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => dialog.alert(`إهداء ${plan.name} لصديق قريباً!`)}
                className="w-11 h-11 rounded-full bg-gradient-to-b from-[#f6d386] to-[#eab354] text-[#3b2306] flex items-center justify-center shadow-lg active:scale-95 transition"
              >
                <Gift size={20} />
              </button>

              <button
                onClick={handleBuy}
                disabled={busy}
                className="px-7 py-2.5 rounded-full bg-gradient-to-r from-[#f6d386] to-[#eab354] text-[#3b2306] font-black text-base shadow-lg active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                <span>
                  {selected <= currentLevel && active ? "تجديد الآن" : "اشتري الآن"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
