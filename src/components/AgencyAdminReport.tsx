// [ezo-agency] Special admin page — Excel-style tables for agencies + hosts
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import {
  ChevronRight, Loader2, Download, Users, Building2,
  Search, Filter, TrendingUp, DollarSign, Award,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  onClose: () => void;
}

type Tab = "agencies" | "hosts";

export default function AgencyAdminReport({ onClose }: Props) {
  const deviceId = getDeviceId();
  const [tab, setTab] = useState<Tab>("agencies");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const agenciesData = useQuery(
    api.agencies.adminAgenciesReport,
    tab === "agencies" ? { tokenOverride: getActiveToken() ?? deviceId } : "skip" as any
  );

  const hostsData = useQuery(
    api.agencies.adminSalariesReport,
    tab === "hosts" ? { tokenOverride: getActiveToken() ?? deviceId, month } : "skip" as any
  );

  const loading = tab === "agencies" ? agenciesData === undefined : hostsData === undefined;

  // ===== فلترة =====
  const filteredAgencies = (agenciesData?.agencies ?? []).filter((a: any) =>
    search.trim().length === 0
      ? true
      : a.name.toLowerCase().includes(search.toLowerCase()) ||
        String(a.agencyNumber ?? "").includes(search)
  );

  const filteredHosts = (hostsData?.hosts ?? []).filter((h: any) =>
    search.trim().length === 0
      ? true
      : h.userName.toLowerCase().includes(search.toLowerCase()) ||
        String(h.userNumber ?? "").includes(search) ||
        (h.agencyName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ===== التصدير =====
  const handleExportCSV = () => {
    if (tab === "agencies") {
      const rows = [
        ["رقم الوكالة", "الاسم", "المستوى", "المالك", "ID المالك", "عدد المضيفين", "إجمالي الدخل", "إجمالي الراتب", "إجمالي العمولة"],
        ...filteredAgencies.map((a: any) => [
          a.agencyNumber ?? "—",
          a.name,
          a.level,
          a.ownerName,
          a.ownerNumber ?? "—",
          a.hostCount,
          a.totalIncome,
          a.totalSalary,
          a.totalAgencyCut,
        ]),
      ];
      downloadCSV(rows, `agencies-${Date.now()}.csv`);
    } else {
      const rows = [
        ["#", "الاسم", "ID", "الوكالة", "رقم الوكالة", "الأيام", "الساعات", "الماس", "قيمة السحر", "الدخل", "المستوى", "راتب أساسي", "راتب ماس", "إجمالي", "عمولة الوكالة"],
        ...filteredHosts.map((h: any, i: number) => [
          i + 1,
          h.userName,
          h.userNumber ?? "—",
          h.agencyName,
          h.agencyNumber ?? "—",
          h.days,
          h.hours,
          h.diamondsHeld,
          h.income,
          h.income,
          h.level,
          h.baseSalary,
          h.diamondSalary,
          h.totalSalary,
          h.agencyCut,
        ]),
        [],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "basic gross salary", hostsData?.totals.totalBase ?? 0],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "total diamond salary", hostsData?.totals.totalDiamond ?? 0],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "guild total salary", hostsData?.totals.totalAgencyCut ?? 0],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "total salary", hostsData?.totals.totalSalary ?? 0],
      ];
      downloadCSV(rows, `hosts-${month}-${Date.now()}.csv`);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
          <h1 className="text-white text-base font-black flex-1">تقارير الوكالات</h1>
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Download size={14} /> تصدير
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setTab("agencies")}
            className={`flex-1 py-2 rounded-xl border text-xs font-black transition ${
              tab === "agencies"
                ? "bg-purple-500/30 border-purple-400/60 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            <Building2 size={12} className="inline ml-1" />
            الوكالات ({agenciesData?.agencies.length ?? 0})
          </button>
          <button
            onClick={() => setTab("hosts")}
            className={`flex-1 py-2 rounded-xl border text-xs font-black transition ${
              tab === "hosts"
                ? "bg-purple-500/30 border-purple-400/60 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            <Users size={12} className="inline ml-1" />
            المضيفون ({hostsData?.hosts.length ?? 0})
          </button>
        </div>

        {/* Search + Month */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "agencies" ? "ابحث بالاسم أو الرقم..." : "ابحث بالاسم أو الوكالة..."}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
            />
          </div>
          {tab === "hosts" && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white/10 border border-white/15 rounded-xl px-3 text-white text-xs font-black"
              dir="ltr"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-950">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-white/40" />
          </div>
        ) : tab === "agencies" ? (
          <AgenciesTable rows={filteredAgencies} totals={agenciesData?.totals} />
        ) : (
          <HostsTable rows={filteredHosts} totals={hostsData?.totals} month={month} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Agencies Table
// ============================================================
function AgenciesTable({ rows, totals }: any) {
  if (rows.length === 0) {
    return <Empty icon={Building2} text="لا توجد وكالات" />;
  }
  return (
    <div className="min-w-max">
      <table className="text-xs border-collapse" dir="rtl">
        <thead className="sticky top-0 bg-slate-800 text-white z-10">
          <tr>
            <Th>#</Th>
            <Th>رقم</Th>
            <Th>الاسم</Th>
            <Th>المستوى</Th>
            <Th>المالك</Th>
            <Th>ID</Th>
            <Th>مضيفين</Th>
            <Th>الدخل</Th>
            <Th>الراتب</Th>
            <Th>العمولة</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a: any, i: number) => (
            <tr key={a._id} className={i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"}>
              <Td>{i + 1}</Td>
              <Td><span className="font-black text-teal-300">{a.agencyNumber ?? "—"}</span></Td>
              <Td className="font-black">{a.name}</Td>
              <Td><span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">{a.level}</span></Td>
              <Td>{a.ownerName}</Td>
              <Td className="text-white/60" dir="ltr">{a.ownerNumber ?? "—"}</Td>
              <Td className="text-emerald-300 font-black">{a.hostCount}</Td>
              <Td className="text-purple-300">{formatNum(a.totalIncome)}</Td>
              <Td className="text-amber-300">${a.totalSalary.toLocaleString()}</Td>
              <Td className="text-pink-300">${a.totalAgencyCut.toLocaleString()}</Td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-slate-700 font-black">
            <Td colSpan={6} className="text-center">الإجمالي</Td>
            <Td className="text-emerald-300">{totals?.totalHosts ?? 0}</Td>
            <Td className="text-purple-300">{formatNum(totals?.totalIncome ?? 0)}</Td>
            <Td className="text-amber-300">${(totals?.totalSalary ?? 0).toLocaleString()}</Td>
            <Td>—</Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Hosts Table (Excel-style)
// ============================================================
function HostsTable({ rows, totals, month }: any) {
  if (rows.length === 0) {
    return <Empty icon={Users} text="لا يوجد مضيفون" />;
  }
  return (
    <div className="min-w-max">
      <table className="text-xs border-collapse" dir="rtl">
        <thead className="sticky top-0 bg-slate-800 text-white z-10">
          <tr>
            <Th>#</Th>
            <Th>الاسم</Th>
            <Th>ID</Th>
            <Th>الوكالة</Th>
            <Th>رقم</Th>
            <Th>أيام</Th>
            <Th>ساعات</Th>
            <Th>الماس</Th>
            <Th>قيمة السحر</Th>
            <Th>المستوى</Th>
            <Th>راتب أساسي</Th>
            <Th>راتب ماس</Th>
            <Th>إجمالي</Th>
            <Th>عمولة</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h: any, i: number) => (
            <tr key={h._id} className={i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"}>
              <Td>{i + 1}</Td>
              <Td className="font-black">{h.userName}</Td>
              <Td className="text-white/60" dir="ltr">{h.userNumber ?? "—"}</Td>
              <Td>{h.agencyName}</Td>
              <Td className="text-teal-300 font-black">{h.agencyNumber ?? "—"}</Td>
              <Td>{h.days}</Td>
              <Td>{h.hours}</Td>
              <Td className="text-cyan-300">{h.diamondsHeld.toLocaleString()}</Td>
              <Td className="text-purple-300">{formatNum(h.income)}</Td>
              <Td><span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">Lv.{h.level}</span></Td>
              <Td className="text-blue-300">${h.baseSalary.toLocaleString()}</Td>
              <Td className="text-pink-300">${h.diamondSalary.toLocaleString()}</Td>
              <Td className="text-emerald-300 font-black">${h.totalSalary.toLocaleString()}</Td>
              <Td className="text-red-300">${h.agencyCut.toLocaleString()}</Td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-slate-700 font-black">
            <Td colSpan={10} className="text-center">الفاتورة الإجمالية</Td>
            <Td colSpan={2} className="text-blue-300">
              basic gross: ${(totals?.totalBase ?? 0).toLocaleString()}
            </Td>
            <Td className="text-emerald-300">${(totals?.totalSalary ?? 0).toLocaleString()}</Td>
            <Td className="text-red-300">${(totals?.totalAgencyCut ?? 0).toLocaleString()}</Td>
          </tr>
          <tr className="bg-slate-700">
            <Td colSpan={10} className="text-center font-black">إجمالي راتب الماس</Td>
            <Td colSpan={4} className="text-pink-300 font-black">${(totals?.totalDiamond ?? 0).toLocaleString()}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function Th({ children, className = "" }: any) {
  return (
    <th className={`px-3 py-2 text-right border border-slate-700 text-[11px] whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "", colSpan, dir }: any) {
  return (
    <td colSpan={colSpan} dir={dir} className={`px-3 py-2 border border-slate-700 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

function Empty({ icon: Icon, text }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/40">
      <Icon size={48} className="mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// CSV with BOM for Arabic Excel compatibility
function downloadCSV(rows: (string | number)[][], filename: string) {
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
