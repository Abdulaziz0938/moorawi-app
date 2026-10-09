import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import {
  X, ChevronRight, Loader2, Coins, Gem, History,
  CreditCard, ArrowLeftRight, Send, Receipt, Sparkles,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type View = "main" | "recharge" | "exchange" | "history";

// Poppo-style recharge packages
const PACKAGES = [
  { coins: 1000,   usdCents: 49,    bonus: 0,     label: "USD 0.49" },
  { coins: 2000,   usdCents: 99,    bonus: 0,     label: "USD 0.99", highlight: true, tag: "مرة واحدة" },
  { coins: 10000,  usdCents: 499,   bonus: 0,     label: "USD 4.99" },
  { coins: 20000,  usdCents: 999,   bonus: 0,     label: "USD 9.99" },
  { coins: 100000, usdCents: 4999,  bonus: 1300,  label: "USD 49.99" },
  { coins: 200000, usdCents: 9999,  bonus: 4500,  label: "USD 99.99" },
  { coins: 400000, usdCents: 19999, bonus: 13000, label: "USD 199.99" },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

function formatDate(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("ar-SY") + " " + d.toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date(ts).toISOString().slice(0, 16);
  }
}

export default function WalletSheet({ onClose }: Props) {
  const token = getActiveToken();
  const balance = useQuery(api.wallet.balance, { tokenOverride: token });
  const history = useQuery(api.wallet.transactions, { tokenOverride: token, limit: 50 });

  const recharge = useMutation(api.wallet.recharge);
  const exchange = useMutation(api.wallet.exchangeDiamonds);

  const [view, setView] = useState<View>("main");
  const [exchangeInput, setExchangeInput] = useState("");
  const [busy, setBusy] = useState(false);

  const coins = balance?.coins ?? 0;
  const diamonds = balance?.diamonds ?? 0;

  const handleRecharge = async (pkg: typeof PACKAGES[number]) => {
    setBusy(true);
    try {
      await recharge({
        amount: pkg.coins + (pkg.bonus ?? 0),
        usdCents: pkg.usdCents,
        meta: `شحن ${pkg.coins.toLocaleString()} 💰 (${pkg.label})`,
        tokenOverride: token,
      });
      dialog.alert(`تم شحن ${pkg.coins.toLocaleString()} عملة ذهبية ✅`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الشحن");
    } finally {
      setBusy(false);
    }
  };

  const handleExchange = async () => {
    const amt = parseInt(exchangeInput || "0", 10);
    if (!amt || amt <= 0) {
      dialog.alert("أدخل عدداً صحيحاً أكبر من صفر");
      return;
    }
    if (amt > diamonds) {
      dialog.alert("رصيد الماس غير كافٍ");
      return;
    }
    setBusy(true);
    try {
      await exchange({ diamonds: amt, tokenOverride: token });
      dialog.alert(`تم استبدال ${amt} 💎 بـ ${amt} 💰`);
      setExchangeInput("");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الاستبدال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[88dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {view !== "main" ? (
              <button onClick={() => setView("main")} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
                <ChevronRight size={20} />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                <Coins size={18} className="text-white" />
              </div>
            )}
            <h2 className="text-white text-lg font-black">
              {view === "main" && "المحفظة"}
              {view === "recharge" && "شحن العملات"}
              {view === "exchange" && "استبدال الماس"}
              {view === "history" && "سجل العمليات"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto">

          {/* ============ MAIN ============ */}
          {view === "main" && (
            <div className="p-4 space-y-4">
              {/* Balance card */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-5 shadow-2xl">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -right-4 top-12 w-20 h-20 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins size={18} className="text-white/90" />
                    <span className="text-white/80 text-xs font-bold">عملاتي الذهبية</span>
                  </div>
                  <p className="text-white text-4xl font-black mb-4 tabular-nums" dir="ltr">
                    {formatNum(coins)}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <Gem size={14} className="text-blue-100" />
                    <span className="text-white/80 text-[11px] font-bold">الماس</span>
                    <span className="text-white text-sm font-black ml-1 tabular-nums" dir="ltr">
                      {formatNum(diamonds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setView("recharge")}
                  className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <CreditCard size={20} className="text-white" />
                  </div>
                  <span className="text-white text-sm font-black">شحن</span>
                </button>
                <button
                  onClick={() => setView("exchange")}
                  className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowLeftRight size={20} className="text-white" />
                  </div>
                  <span className="text-white text-sm font-black">استبدال الماس</span>
                </button>
              </div>

              {/* Exchange hint */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Gem size={16} className="text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">1 ماسة = 1 عملة ذهبية</p>
                  <p className="text-white/50 text-[10px] mt-0.5">يمكن استبدال الماس بعملات ذهبية</p>
                </div>
              </div>

              {/* History button */}
              <button
                onClick={() => setView("history")}
                className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-4 flex items-center justify-between active:scale-95 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <History size={16} className="text-purple-300" />
                  </div>
                  <span className="text-white text-sm font-bold">سجل العمليات</span>
                </div>
                <ChevronRight size={18} className="text-white/40 rotate-180" />
              </button>
            </div>
          )}

          {/* ============ RECHARGE ============ */}
          {view === "recharge" && (
            <div className="p-4">
              <p className="text-white/60 text-xs text-center mb-3">اختر الباقة</p>
              <div className="grid grid-cols-2 gap-3">
                {PACKAGES.map((pkg, i) => (
                  <button
                    key={i}
                    disabled={busy}
                    onClick={() => handleRecharge(pkg)}
                    className={`relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 active:scale-95 transition disabled:opacity-50 ${
                      pkg.highlight
                        ? "bg-emerald-500/15 border-emerald-400/50"
                        : "bg-white/5 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {pkg.tag && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black">
                        {pkg.tag}
                      </span>
                    )}
                    {pkg.bonus > 0 && (
                      <span className="absolute -top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black">
                        +{pkg.bonus}
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mt-2">
                      <Coins size={24} className="text-white" />
                    </div>
                    <p className="text-white text-base font-black tabular-nums" dir="ltr">
                      {pkg.coins.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-[10px]">{pkg.label}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
                <p className="text-emerald-200 text-[11px] text-center font-bold">
                  🎁 اشحن 0.99$ واحصل على هدايا مجانية
                </p>
              </div>
            </div>
          )}

          {/* ============ EXCHANGE ============ */}
          {view === "exchange" && (
            <div className="p-4 space-y-4">
              {/* Balance summary */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-400/30 p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-blue-200 text-[10px] mb-1">الماس المتوفر</p>
                    <p className="text-white text-xl font-black tabular-nums" dir="ltr">{formatNum(diamonds)}</p>
                  </div>
                  <div>
                    <p className="text-amber-200 text-[10px] mb-1">العملات الحالية</p>
                    <p className="text-white text-xl font-black tabular-nums" dir="ltr">{formatNum(coins)}</p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div>
                <label className="text-white/70 text-xs font-bold mb-2 block">
                  استبدل (1 💎 = 1 💰)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={exchangeInput}
                    onChange={(e) => setExchangeInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-4 text-white text-lg font-black focus:outline-none focus:border-blue-400 tabular-nums"
                    dir="ltr"
                    disabled={busy}
                  />
                  <Gem size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setExchangeInput(String(v))}
                      disabled={busy}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold active:scale-95 transition disabled:opacity-50"
                    >
                      {v}
                    </button>
                  ))}
                  <button
                    onClick={() => setExchangeInput(String(diamonds))}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-blue-500/30 hover:bg-blue-500/40 text-white text-xs font-black active:scale-95 transition disabled:opacity-50"
                  >
                    الكل
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleExchange}
                disabled={busy || !exchangeInput || parseInt(exchangeInput) <= 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-base shadow-lg active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <ArrowLeftRight size={20} />}
                استبدال
              </button>
            </div>
          )}

          {/* ============ HISTORY ============ */}
          {view === "history" && (
            <div className="p-4">
              {history === undefined ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-white/40" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                  <History size={48} className="mb-3 opacity-40" />
                  <p className="text-sm">لا توجد عمليات بعد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((tx: any) => {
                    const positive = tx.amount > 0;
                    return (
                      <div key={tx._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          positive ? "bg-emerald-500/20" : "bg-red-500/20"
                        }`}>
                          {tx.type === "recharge" ? <CreditCard size={16} className="text-emerald-300" /> :
                           tx.type === "exchange" ? <ArrowLeftRight size={16} className="text-blue-300" /> :
                           tx.type === "gift_sent" ? <Send size={16} className="text-pink-300" /> :
                           tx.type === "reward" ? <Sparkles size={16} className="text-amber-300" /> :
                           <Receipt size={16} className="text-white/60" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{tx.meta || tx.type}</p>
                          <p className="text-white/40 text-[10px] mt-0.5">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-black tabular-nums ${positive ? "text-emerald-300" : "text-red-300"}`} dir="ltr">
                            {positive ? "+" : ""}{formatNum(tx.amount)}
                          </p>
                          <p className="text-white/40 text-[10px] tabular-nums" dir="ltr">
                            {formatNum(tx.balanceAfter)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
