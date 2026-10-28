import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { X, ChevronRight, Loader2, Coins, Gem, History, CreditCard, ArrowLeftRight, Send, Receipt, Sparkles, Gift, Users, ShieldCheck, Info } from "lucide-react";
import AgentMarketSheet from "./AgentMarketSheet";
import BecomeAgentSheet from "./BecomeAgentSheet";
import Card from "./ui/Card";
import StatBadge from "./ui/StatBadge";
import SectionTitle from "./ui/SectionTitle";

// [ezo-sham] عنوان محفظة شام كاش الرسمية
const SHAM_WALLET = "702c4e686c4f23cb5cf92874427aeb4b";
const COINS_PER_DOLLAR = 1000; // ✅ سعر الصرف: 1 دولار = 1000 عملة

interface Props {
  onClose: () => void;
}

type View = "main" | "recharge" | "exchange" | "history" | "requests";

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
  const packages = useQuery(api.wallet.listPackages, {});
  const myRequests = useQuery(api.wallet.myRechargeRequests, { tokenOverride: token, limit: 30 });

  const requestRecharge = useMutation(api.wallet.requestRecharge);
  const exchange = useMutation(api.wallet.exchangeDiamonds);

  const [view, setView] = useState<View>("main");
  const [exchangeInput, setExchangeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAgentMarket, setShowAgentMarket] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [txnRef, setTxnRef] = useState("");
  const [showBecomeAgent, setShowBecomeAgent] = useState(false);

  const coins = balance?.coins ?? 0;
  const diamonds = balance?.diamonds ?? 0;

  const handleSelectPackage = (pkg: any) => {
    setSelectedPkg(pkg);
    setTxnRef("");
  };

  const handleSubmitRequest = async () => {
    if (!selectedPkg) return;
    const ref = txnRef.trim();
    if (ref.length < 4) {
      dialog.alert("أدخل رقم عملية التحويل");
      return;
    }
    setBusy(true);
    try {
      await requestRecharge({
        packageCode: selectedPkg.code,
        method: "sham_cash",
        txnRef: ref,
        tokenOverride: token,
      });
      dialog.alert("تم إرسال طلب الشحن. سيتم التحقق خلال دقائق.");
      setSelectedPkg(null);
      setTxnRef("");
      setView("requests");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل إرسال الطلب");
    } finally {
      setBusy(false);
    }
  };

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(SHAM_WALLET);
      dialog.alert("تم نسخ العنوان");
    } catch {
      dialog.alert(SHAM_WALLET);
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
      {selectedPkg && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-end" dir="rtl" onClick={() => !busy && setSelectedPkg(null)}>
          <div className="w-full max-w-md mx-auto bg-gradient-to-b from-slate-900 to-black rounded-t-3xl border-t border-emerald-400/40 max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white text-base font-black">تأكيد طلب الشحن</h3>
              <button onClick={() => !busy && setSelectedPkg(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-4 flex items-center gap-3">
                <Coins size={22} className="text-amber-300" />
                <span className="text-white font-black tabular-nums" dir="ltr">{selectedPkg.coins.toLocaleString()}</span>
                <span className="text-emerald-300 font-black ml-auto tabular-nums" dir="ltr">{selectedPkg.label}</span>
              </div>
              <button onClick={copyWallet} className="w-full rounded-xl bg-black/40 border border-emerald-400/30 px-3 py-3 flex items-center gap-2">
                <span className="text-emerald-300 text-[10px] font-black">العنوان:</span>
                <span className="text-white text-[10px] font-mono flex-1 truncate text-left" dir="ltr">{SHAM_WALLET}</span>
              </button>
              <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="رقم عملية التحويل..." className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm outline-none" dir="ltr" />
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={handleSubmitRequest} disabled={busy || txnRef.trim().length < 4} className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={18} className="animate-spin" /> : (<><Send size={18} />إرسال طلب الشحن</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgentMarket && (
        <div onClick={(e) => e.stopPropagation()}>
          <AgentMarketSheet onClose={() => setShowAgentMarket(false)} />
        </div>
      )}
      {showBecomeAgent && (
        <div onClick={(e) => e.stopPropagation()}>
          <BecomeAgentSheet onClose={() => setShowBecomeAgent(false)} />
        </div>
      )}
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[88dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
              {view === "requests" && "طلبات الشحن"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === "main" && (
            <div className="p-4 space-y-4">
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

              <div>
                <SectionTitle icon={Sparkles} title="إجراءات سريعة" tone="gold" />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setView("recharge")} className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <CreditCard size={20} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-black">شحن</span>
                  </button>
                  <button onClick={() => setView("exchange")} className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <ArrowLeftRight size={20} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-black">استبدال الماس</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button onClick={() => setShowAgentMarket(true)} className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Users size={20} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-black">شحن عبر وكيل</span>
                  </button>
                  <button onClick={() => setShowBecomeAgent(true)} className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 flex flex-col items-center gap-2 active:scale-95 transition shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <ShieldCheck size={20} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-black">كن وكيلاً</span>
                  </button>
                </div>
              </div>

              <Card tone="default" padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Gem size={16} className="text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold">1 ماسة = 1 عملة ذهبية</p>
                    <p className="text-white/50 text-[10px] mt-0.5">يمكن استبدال الماس بعملات ذهبية</p>
                  </div>
                </div>
              </Card>

              <Card interactive onClick={() => setView("history")} padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <History size={16} className="text-purple-300" />
                    </div>
                    <span className="text-white text-sm font-bold">سجل العمليات</span>
                  </div>
                  <ChevronRight size={18} className="text-white/40 rotate-180" />
                </div>
              </Card>
              <Card interactive onClick={() => setView("requests")} padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Receipt size={16} className="text-emerald-300" />
                    </div>
                    <span className="text-white text-sm font-bold">طلبات الشحن</span>
                  </div>
                  <ChevronRight size={18} className="text-white/40 rotate-180" />
                </div>
              </Card>
            </div>
          )}

          {view === "recharge" && (
            <div className="p-4">
              <SectionTitle icon={CreditCard} title="الباقات المتاحة" tone="emerald" />

              {/* ✅ إضافة التنبيه بسعر الصرف */}
              <div className="rounded-xl bg-blue-500/10 border border-blue-400/30 p-3 mb-3 flex items-center gap-2">
                <Info size={16} className="text-blue-400 flex-shrink-0" />
                <p className="text-blue-200 text-[11px] font-bold">
                  سعر الصرف المعتمد: <span className="font-black text-white" dir="ltr">1$ = {COINS_PER_DOLLAR} Coins</span>
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-emerald-300" />
                  </div>
                  <p className="text-emerald-200 text-xs font-black">شحن عبر شام كاش</p>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed mb-2">
                  1) حوّل المبلغ إلى المحفظة التالية<br />
                  2) احتفظ برقم العملية<br />
                  3) اختر الباقة وأدخل رقم العملية
                </p>
                <button onClick={copyWallet} className="w-full rounded-xl bg-black/40 border border-emerald-400/30 px-3 py-2 flex items-center gap-2 active:scale-95">
                  <span className="text-emerald-300 text-[10px] font-black flex-shrink-0">العنوان:</span>
                  <span className="text-white/90 text-[10px] font-mono truncate flex-1 text-left" dir="ltr">
                    {SHAM_WALLET}
                  </span>
                  <span className="text-emerald-300 text-[10px] font-black flex-shrink-0">نسخ</span>
                </button>
              </div>

              {packages === undefined ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-white/40" />
                </div>
              ) : packages.length === 0 ? (
                <Card tone="default" padding="md">
                  <p className="text-white/60 text-xs text-center">لا توجد باقات متاحة حالياً</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {packages.map((pkg: any) => (
                    <button
                      key={pkg._id}
                      disabled={busy}
                      onClick={() => handleSelectPackage(pkg)}
                      className={`relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 active:scale-95 transition disabled:opacity-50 ${
                        pkg.highlight ? "bg-emerald-500/15 border-emerald-400/50" : "bg-white/5 border-white/15 hover:bg-white/10"
                      }`}
                    >
                      {pkg.tag && (
                        <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black">
                          {pkg.tag}
                        </span>
                      )}
                      {pkg.bonus > 0 && (
                        <span className="absolute -top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black">
                          +{pkg.bonus.toLocaleString()}
                        </span>
                      )}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mt-2">
                        <Coins size={24} className="text-white" />
                      </div>
                      <p className="text-white text-base font-black tabular-nums" dir="ltr">
                        {pkg.coins.toLocaleString()}
                      </p>
                      <p className="text-emerald-300 text-sm font-black tabular-nums" dir="ltr">
                        {pkg.label}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Card tone="emerald" padding="md">
                  <p className="text-emerald-200 text-[11px] text-center font-bold leading-relaxed">
                    أرسل طلب الشحن وسيتم مراجعته من الإدارة خلال دقائق
                  </p>
                </Card>
              </div>
            </div>
          )}

          {view === "requests" && (
            <div className="p-4 space-y-2">
              {myRequests === undefined ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-white/40" />
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-black">لا توجد طلبات بعد</p>
                  <p className="text-[11px] mt-1">اذهب إلى "شحن العملات" لإرسال طلب</p>
                </div>
              ) : (
                myRequests.map((r: any) => {
                  const statusMap: any = {
                    pending: { label: "قيد المراجعة", color: "text-amber-300", bg: "bg-amber-500/15 border-amber-400/30" },
                    approved: { label: "مقبول", color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-400/30" },
                    rejected: { label: "مرفوض", color: "text-red-300", bg: "bg-red-500/15 border-red-400/30" },
                  };
                  const st = statusMap[r.status] ?? statusMap.pending;
                  return (
                    <div key={r._id} className={`rounded-2xl border p-3 ${st.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-black ${st.color}`}>{st.label}</span>
                        <span className="text-white/40 text-[10px] tabular-nums" dir="ltr">
                          {new Date(r.createdAt).toLocaleString("ar-SY")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins size={16} className="text-amber-400" />
                        <span className="text-white font-black text-sm tabular-nums" dir="ltr">
                          {r.totalCoins.toLocaleString()}
                        </span>
                        <span className="text-white/50 text-[11px]">عملة</span>
                        {r.priceSYP > 0 && (
                          <span className="text-white/40 text-[10px] ml-auto tabular-nums" dir="ltr">
                            {r.priceSYP.toLocaleString()} SYP
                          </span>
                        )}
                      </div>
                      {r.adminNote && (
                        <p className="text-white/60 text-[10px] mt-2 pt-2 border-t border-white/10">
                          {r.adminNote}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {view === "exchange" && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatBadge icon={Gem} label="الماس المتوفر" value={formatNum(diamonds)} tone="purple" size="sm" />
                <StatBadge icon={Coins} label="العملات الحالية" value={formatNum(coins)} tone="gold" size="sm" />
              </div>

              <Card tone="default" padding="md">
                <label className="text-white/70 text-xs font-bold mb-2 block">
                  استبدل (1 <Gem size={10} className="inline text-cyan-400" /> = 1 <Coins size={10} className="inline text-amber-400" />)
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
                <div className="flex gap-2 mt-3">
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
              </Card>

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
