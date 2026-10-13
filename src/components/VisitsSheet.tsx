import { useState } from "react";
// [moorawi-services] الزيارات الأخيرة
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import VipAvatar from "./ui/VipAvatar";
import { useAssets } from "../lib/assets";
import { ChevronRight, Loader2, Clock, Eye, User, Crown, Lock, Sparkles } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

export default function VisitsSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const visits = useQuery(
    api.visits.recent,
    me ? { userId: me._id } : ("skip" as any)
  );
  const countThisMonth = useQuery(
    api.visits.countThisMonth,
    me ? { userId: me._id } : ("skip" as any)
  );
  const [showVip, setShowVip] = useState(false);

  const vipLevel = (me as any)?.vipLevel ?? 0;
  const vipExpiresAt = (me as any)?.vipExpiresAt ?? null;
  const isVip = vipLevel > 0 && (!vipExpiresAt || vipExpiresAt > Date.now());

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الزوار" icon={Eye} assetKey="ui.sheet.visits" />

      <div className="flex-1 overflow-y-auto">
        {isVip ? (
          /* ═══════ VIP — القائمة الكاملة ═══════ */
          <div className="p-4">
            {visits === undefined ? (
              <Spinner />
            ) : visits.length === 0 ? (
              <Empty icon={Eye} text="لا توجد زيارات بعد" />
            ) : (
              <div className="space-y-2">
                {visits.map((v: any) => (
                  <button
                    key={v._id}
                    onClick={() => onUserClick?.(v.visitorId)}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 active:bg-white/10"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                      <VipAvatar src={v.avatarUrl} name={v.name} size={48} vip={v.vip ?? 0} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-white text-sm font-black truncate">{v.name ?? "—"}</p>
                      <p className="text-white/40 text-[10px]" dir="ltr">ID:{v.userNumber ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Clock size={11} className="text-white/40" />
                      <span className="text-white/40 text-[9px]">
                        {new Date(v.visitedAt ?? Date.now()).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ═══════ Non-VIP — رسالة + صور مموهة + CTA ═══════ */
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            {/* Avatar row (blurred) */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {(visits ?? []).slice(0, 5).map((v: any, i: number) => (
                <div
                  key={v._id ?? i}
                  className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/40 shadow-lg"
                  style={{ filter: "blur(3px) brightness(0.7)" }}
                >
                  <VipAvatar src={v.avatarUrl} name={v.name ?? "?"} size={56} vip={0} ring={false} />
                </div>
              ))}
              {(!visits || visits.length === 0) && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-14 h-14 rounded-full bg-purple-700/40 border-2 border-amber-400/40" />
                  ))}
                </>
              )}
            </div>

            {/* Message */}
            <p className="text-white text-base font-black text-center leading-relaxed max-w-xs">
              زار إجمالي المستخدمين صفحتك الرئيسية سراً هذا الشهر{" "}
              <span className="text-amber-300 text-xl">
                {countThisMonth ?? 0}
              </span>
            </p>
            <p className="text-white/60 text-xs text-center mt-3 max-w-xs leading-relaxed">
              يمكنك التحقق من معلومات الزيارة ووقتها تماماً عن طريق فتح VIP
            </p>

            {/* Spacer */}
            <div className="h-16" />

            {/* VIP CTA button */}
            <button
              onClick={() => setShowVip(true)}
              className="w-full max-w-xs py-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-base font-black shadow-lg shadow-amber-500/30 active:scale-95 transition"
            >
              فتح VIP
            </button>

            <p className="text-white/50 text-[11px] text-center mt-5 max-w-xs leading-relaxed">
              فتح VIP للحصول على هوية حصرية ومؤثرات الدخول الخاصة ، واستمتع بها يصل إلى{" "}
              <span className="text-amber-300 font-black">+15</span> امتياز
            </p>
          </div>
        )}
      </div>

      {showVip && (
        <VipShopSheetLazy onClose={() => setShowVip(false)} />
      )}
    </div>
  );
}

// Lazy import helper — VipShopSheet is heavy
function VipShopSheetLazy({ onClose }: { onClose: () => void }) {
  const React = require("react");
  const Comp = React.lazy(() => import("./VipShopSheet"));
  return (
    <React.Suspense fallback={null}>
      <Comp onClose={onClose} />
    </React.Suspense>
  );
}

export function Header({ onClose, title, icon: Icon, assetKey }: any) {
  const assets = useAssets();
  const customIcon = assetKey ? assets[assetKey] : null;
  return (
    <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
      <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95">
        <ChevronRight size={20} />
      </button>
      {customIcon ? (
        <img src={customIcon} alt="" className="w-7 h-7 object-contain" draggable={false} />
      ) : Icon ? (
        <Icon size={18} className="text-white/70" />
      ) : null}
      <h1 className="text-white text-base font-black flex-1">{title}</h1>
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-white/40" /></div>;
}

export function Empty({ icon: Icon, text }: any) {
  return (
    <div className="text-center py-16 text-white/40">
      <Icon size={48} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
