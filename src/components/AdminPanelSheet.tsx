import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import {
  X, Loader2, Search, Coins, Gem, Ban, ShieldCheck, Crown,
  Users, Home, ShoppingBag, TrendingUp, Plus, Save, ChevronLeft,
  UserCheck, UserX,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type View = "main" | "userEdit";

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

export default function AdminPanelSheet({ onClose }: Props) {
  const token = getActiveToken();
  const stats = useQuery(api.adminPanel.stats, { tokenOverride: token });
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editField, setEditField] = useState({ coins: "", diamonds: "", vip: "" });
  const [busy, setBusy] = useState(false);
  const [grantAmount, setGrantAmount] = useState("10000");

  const usersData = useQuery(api.adminPanel.listUsers, {
    tokenOverride: token,
    search: search.trim() || undefined,
    limit: 30,
  });

  const updateUser = useMutation(api.adminPanel.updateUser);
  const grantCoins = useMutation(api.adminPanel.grantCoins);

  const handleOpenEdit = (u: any) => {
    setEditUser(u);
    setEditField({
      coins: String(u.coins ?? 0),
      diamonds: String(u.diamonds ?? 0),
      vip: String(u.vipLevel ?? 0),
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setBusy(true);
    try {
      await updateUser({
        tokenOverride: token,
        userId: editUser._id,
        coins: parseInt(editField.coins || "0", 10),
        diamonds: parseInt(editField.diamonds || "0", 10),
        vipLevel: parseInt(editField.vip || "0", 10),
      });
      dialog.alert("تم الحفظ ✅");
      setEditUser(null);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const handleGrant = async (u: any, sign: 1 | -1) => {
    const amt = parseInt(grantAmount, 10);
    if (!amt || amt <= 0) {
      dialog.alert("أدخل مبلغاً صحيحاً");
      return;
    }
    setBusy(true);
    try {
      await grantCoins({
        tokenOverride: token,
        userId: u._id,
        amount: amt * sign,
      });
      dialog.alert(`${sign > 0 ? "منح" : "خصم"} ${amt.toLocaleString()} عملة`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBan = async (u: any) => {
    dialog.confirm(
      u.banned ? `إلغاء حظر ${u.username}?` : `حظر ${u.username}?`,
      async () => {
        setBusy(true);
        try {
          await updateUser({ tokenOverride: token, userId: u._id, banned: !u.banned });
        } catch (e: any) {
          dialog.alert(e?.message);
        } finally {
          setBusy(false);
        }
      },
    );
  };

  const handleToggleAdmin = async (u: any) => {
    const nextRole = u.adminRole === "moderator" ? null : "moderator";
    dialog.confirm(
      nextRole === "moderator" ? `ترقية ${u.username} لمشرف؟` : `إزالة صلاحيات المشرف؟`,
      async () => {
        setBusy(true);
        try {
          await updateUser({ tokenOverride: token, userId: u._id, adminRole: nextRole });
        } catch (e: any) {
          dialog.alert(e?.message);
        } finally {
          setBusy(false);
        }
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-red-950/40 via-slate-900 to-black rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden border-t border-red-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {editUser ? (
              <button onClick={() => setEditUser(null)} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
                <ChevronLeft size={20} className="rotate-180" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <Crown size={18} className="text-white" />
              </div>
            )}
            <h2 className="text-white text-lg font-black">
              {editUser ? `تعديل: ${editUser.username}` : "لوحة المالك"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto">

          {/* ============ EDIT USER ============ */}
          {editUser ? (
            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {editUser.avatarUrl ? (
                    <img src={editUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xl font-black">{editUser.name?.[0] || "?"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black truncate">{editUser.name || "—"}</p>
                  <p className="text-white/60 text-xs" dir="ltr">@{editUser.username || "—"}</p>
                  <p className="text-white/40 text-[10px]">ID: {editUser.userNumber}</p>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-xs font-bold mb-1.5 block">💰 العملات</label>
                  <input
                    type="number"
                    value={editField.coins}
                    onChange={(e) => setEditField({ ...editField, coins: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white font-black tabular-nums focus:outline-none focus:border-amber-400"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-xs font-bold mb-1.5 block">💎 الماس</label>
                  <input
                    type="number"
                    value={editField.diamonds}
                    onChange={(e) => setEditField({ ...editField, diamonds: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white font-black tabular-nums focus:outline-none focus:border-blue-400"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-xs font-bold mb-1.5 block">👑 VIP (0-7)</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={editField.vip}
                    onChange={(e) => setEditField({ ...editField, vip: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white font-black tabular-nums focus:outline-none focus:border-purple-400"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Quick grant */}
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3">
                <p className="text-emerald-200 text-xs font-bold mb-2">منح/خصم سريع</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-white text-sm font-black tabular-nums"
                    dir="ltr"
                  />
                  <button
                    onClick={() => handleGrant(editUser, 1)}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-black disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-base shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                حفظ التعديلات
              </button>
            </div>
          ) : (
            <>
              {/* ============ STATS ============ */}
              <div className="p-4 space-y-3">
                {stats === undefined ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={24} className="animate-spin text-white/40" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard icon={Users} label="المستخدمون" value={stats.usersCount} color="text-blue-300" bg="bg-blue-500/15" />
                    <StatCard icon={Home} label="الغرف" value={stats.roomsCount} color="text-emerald-300" bg="bg-emerald-500/15" />
                    <StatCard icon={ShoppingBag} label="المنتجات" value={stats.shopItemsCount} color="text-pink-300" bg="bg-pink-500/15" />
                    <StatCard icon={Ban} label="محظور" value={stats.bannedCount} color="text-red-300" bg="bg-red-500/15" />
                    <StatCard icon={Coins} label="عملات" value={formatNum(stats.totalCoins)} color="text-amber-300" bg="bg-amber-500/15" />
                    <StatCard icon={Gem} label="ماس" value={formatNum(stats.totalDiamonds)} color="text-cyan-300" bg="bg-cyan-500/15" />
                  </div>
                )}
              </div>

              {/* ============ SEARCH ============ */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث بـ ID أو username"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400 text-sm"
                  />
                </div>
              </div>

              {/* ============ USERS LIST ============ */}
              <div className="px-4 pb-4">
                {usersData === undefined ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-white/40" />
                  </div>
                ) : usersData.users.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-white/40">
                    <Users size={40} className="mb-2 opacity-40" />
                    <p className="text-sm">لا نتائج</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {usersData.users.map((u: any) => (
                      <div
                        key={u._id}
                        className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
                      >
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-right"
                        >
                          <div className="w-11 h-11 rounded-full bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-base font-black">{u.name?.[0] || "?"}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-white text-sm font-bold truncate">{u.name || "—"}</p>
                              {u.adminRole === "super" && <Crown size={12} className="text-amber-300 flex-shrink-0" />}
                              {u.adminRole === "moderator" && <ShieldCheck size={12} className="text-sky-300 flex-shrink-0" />}
                              {u.verified && <UserCheck size={12} className="text-emerald-300 flex-shrink-0" />}
                              {u.banned && <Ban size={12} className="text-red-400 flex-shrink-0" />}
                            </div>
                            <p className="text-white/50 text-[10px]" dir="ltr">@{u.username || "—"} · ID:{u.userNumber}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-amber-200 text-[10px] font-bold tabular-nums" dir="ltr">{formatNum(u.coins)}💰</span>
                              <span className="text-cyan-200 text-[10px] font-bold tabular-nums" dir="ltr">{formatNum(u.diamonds)}💎</span>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            disabled={busy}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                              u.adminRole === "moderator" ? "bg-sky-500/30 text-sky-300" : "bg-white/10 text-white/50 hover:bg-white/20"
                            }`}
                          >
                            <ShieldCheck size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleBan(u)}
                            disabled={busy}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                              u.banned ? "bg-red-500/30 text-red-300" : "bg-white/10 text-white/50 hover:bg-white/20"
                            }`}
                          >
                            {u.banned ? <UserX size={14} /> : <Ban size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {usersData.total > usersData.users.length && (
                      <p className="text-white/40 text-center text-xs py-2">
                        عرض {usersData.users.length} من {usersData.total}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Stat Card ============
function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className={`rounded-2xl ${bg} border border-white/10 p-2.5 flex flex-col items-center gap-1`}>
      <Icon size={18} className={color} />
      <p className="text-white text-sm font-black tabular-nums leading-none" dir="ltr">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-white/50 text-[9px]">{label}</p>
    </div>
  );
}
