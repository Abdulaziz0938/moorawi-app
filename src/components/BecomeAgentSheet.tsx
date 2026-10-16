// [ezo-agents] بطاقة شروط التسجيل كـ وكيل شحن
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useBackButton } from "../lib/hooks/useBackButton";
import ProfilePage from "./ProfilePage";
import { ChevronLeft, ShieldCheck, DollarSign, TrendingUp, MessageCircle, Award, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function BecomeAgentSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const admin = useQuery(api.users.searchByUid, { uid: "1" });
  const [openAdmin, setOpenAdmin] = useState<Id<"users"> | null>(null);

  if (openAdmin) {
    return (
      <ProfilePage userId={openAdmin} isMe={false} onClose={() => setOpenAdmin(null)} />
    );
  }

  return (
    <div className="fixed inset-0 z-[190] bg-gradient-to-b from-violet-950 via-slate-900 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-5 border-b border-white/10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-base font-black">كن وكيل شحن معتمد</h1>
          <p className="text-white/50 text-[10px]">انضم لشبكة Ezo الرسمية</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Award size={18} className="text-violet-300" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-500/30 to-purple-700/20 border border-violet-400/30 p-5 text-center">
          <ShieldCheck size={48} className="mx-auto text-violet-300 mb-2" />
          <p className="text-white font-black text-lg">كن شريكاً رسمياً لـ Ezo</p>
          <p className="text-white/60 text-[11px] mt-1 leading-relaxed">
            اربح من بيع العملات الذهبية للمستخدمين
          </p>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <p className="text-white/50 text-[11px] font-black px-2">الشروط الأساسية</p>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} className="text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-black">رسم فتح الحساب</p>
              <p className="text-white/60 text-[11px] mt-1 leading-relaxed">
                <span className="text-amber-300 font-black">500$</span> دفعة واحدة عند التسجيل الأول (غير مستردة)
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-black">حد أدنى للشحن</p>
              <p className="text-white/60 text-[11px] mt-1 leading-relaxed">
                <span className="text-emerald-300 font-black">200$</span> حد أدنى لكل عملية إعادة تعبئة
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={20} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-black">تواصل مباشر مع الإدارة</p>
              <p className="text-white/60 text-[11px] mt-1 leading-relaxed">
                كل عمليات الدفع والتحويل تتم عبر الإدارة بشكل مباشر
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="rounded-2xl bg-violet-500/10 border border-violet-400/30 p-4">
          <p className="text-violet-200 text-xs font-black mb-2">ميزات الوكيل:</p>
          <ul className="text-white/70 text-[11px] space-y-1.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-violet-300 font-black">•</span>
              زر مخصص في حسابك لإدارة الشحن والسجل
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-300 font-black">•</span>
              ظهور حسابك في قائمة الوكلاء المعتمدين
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-300 font-black">•</span>
              تواصل مباشر مع العملاء
            </li>
          </ul>
        </div>

        {/* Contact admin button */}
        <button
          onClick={() => {
            if (admin?.userId) {
              setOpenAdmin(admin.userId as Id<"users">);
            }
          }}
          disabled={!admin?.userId}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm shadow-2xl active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {!admin ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <MessageCircle size={18} />
              تواصل مع الإدارة للتسجيل
            </>
          )}
        </button>

        <p className="text-white/40 text-[10px] text-center pb-3 leading-relaxed">
          سيتم التحقق من طلبك خلال 24 ساعة بعد استلام الدفعة
        </p>
      </div>
    </div>
  );
}
