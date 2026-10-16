// [ezo-gifts] سجل الهدايا — تصميم مطابق لـ Bigo/Yalla/SUGO
//
// - تابان: أرسلت / استلمت
// - كل صف: صورة الطرف الآخر (قابلة للضغط → MiniProfile) + الهدية + الكمية + السعر + الإجمالي + الوقت
// - Summary بالأعلى: عدد الإرسال + الإجمالي (أعلى الصفحة)
// - Header بأيقونة + AssetKey (قابل للتخصيص من AssetsPanel)

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import IconOrImage from "./IconOrImage";
import { Header, Spinner, Empty } from "./VisitsSheet";
import {
  Gift, Send, Inbox, ChevronLeft, Coins, Home, Clock,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

type Tab = "sent" | "received";

// [ezo-utils] وقت نسبي بالعربية
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "الآن";
  if (min < 60) return `منذ ${min} دقيقة`;
  if (hr < 24) return `منذ ${hr} ساعة`;
  if (day < 7) return `منذ ${day} يوم`;
  return new Date(ts).toLocaleDateString("ar-EG");
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function GiftHistorySheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const [tab, setTab] = useState<Tab>("sent");

  const summary = useQuery(api.giftHistory.summary, { tokenOverride: getActiveToken() ?? deviceId });
  const sent = useQuery(api.giftHistory.mySentGifts, { tokenOverride: getActiveToken() ?? deviceId, limit: 100 });
  const received = useQuery(api.giftHistory.myReceivedGifts, { tokenOverride: getActiveToken() ?? deviceId, limit: 100 });

  const list = tab === "sent" ? sent : received;

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="سجل الهدايا" icon={Gift} assetKey="ui.sheet.giftHistory" />

      {/* ====== Summary ====== */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          {/* أرسلت */}
          <button
            onClick={() => setTab("sent")}
            className={`rounded-2xl p-3 text-right border transition ${
              tab === "sent"
                ? "bg-pink-500/20 border-pink-400/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Send size={12} className="text-pink-300" />
              <span className="text-white/70 text-[10px] font-bold">أرسلت</span>
            </div>
            <p className="text-white text-base font-black tabular-nums">
              {summary?.sent?.count ? fmtNum(summary.sent.count) : "0"}
            </p>
            <p className="text-pink-300 text-[10px] font-bold tabular-nums flex items-center gap-1 mt-0.5">
              <Coins size={9} />
              {fmtNum(summary?.sent?.total ?? 0)}
            </p>
          </button>

          {/* استلمت */}
          <button
            onClick={() => setTab("received")}
            className={`rounded-2xl p-3 text-right border transition ${
              tab === "received"
                ? "bg-emerald-500/20 border-emerald-400/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Inbox size={12} className="text-emerald-300" />
              <span className="text-white/70 text-[10px] font-bold">استلمت</span>
            </div>
            <p className="text-white text-base font-black tabular-nums">
              {summary?.received?.count ? fmtNum(summary.received.count) : "0"}
            </p>
            <p className="text-emerald-300 text-[10px] font-bold tabular-nums flex items-center gap-1 mt-0.5">
              <Coins size={9} />
              {fmtNum(summary?.received?.total ?? 0)}
            </p>
          </button>
        </div>
      </div>

      {/* ====== List ====== */}
      <div className="flex-1 overflow-y-auto p-4">
        {list === undefined ? (
          <Spinner />
        ) : list.length === 0 ? (
          <Empty
            icon={tab === "sent" ? Send : Inbox}
            text={tab === "sent" ? "لم تُرسل هدايا بعد" : "لم تستلم هدايا بعد"}
          />
        ) : (
          <div className="space-y-2">
            {list.map((t: any) => {
              const isSent = tab === "sent";
              return (
                <div
                  key={t._id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
                >
                  {/* Avatar — قابل للضغط */}
                  <button
                    onClick={() => onUserClick?.(t.otherUserId)}
                    className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0 ring-1 ring-white/20 active:scale-95 transition"
                  >
                    <UserAvatar avatarUrl={t.otherAvatarUrl} name={t.otherName} className="w-full h-full" />
                  </button>

                  {/* Gift Icon/Image */}
                  <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {t.giftImageUrl ? (
                      <img src={t.giftImageUrl} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Gift size={18} className="text-pink-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white text-sm font-black truncate">
                      {t.giftName} <span className="text-pink-300">×{t.quantity}</span>
                    </p>
                    <p className="text-white/60 text-[11px] truncate">
                      {isSent ? "إلى" : "من"}: {t.otherName}
                      {t.otherUserNumber != null && (
                        <span className="text-white/30"> · ID:{t.otherUserNumber}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/40 text-[9px] flex items-center gap-0.5">
                        <Clock size={8} /> {timeAgo(t._creationTime)}
                      </span>
                      {t.roomName && (
                        <span className="text-white/40 text-[9px] flex items-center gap-0.5 truncate">
                          <Home size={8} /> {t.roomName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span
                      className={`text-xs font-black tabular-nums flex items-center gap-0.5 ${
                        isSent ? "text-pink-300" : "text-emerald-300"
                      }`}
                    >
                      {isSent ? "-" : "+"}
                      {fmtNum(t.totalPrice)}
                      <Coins size={10} />
                    </span>
                    {t.quantity > 1 && (
                      <span className="text-white/40 text-[9px] tabular-nums">
                        {fmtNum(t.unitPrice)} / وحدة
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
