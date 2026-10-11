import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken, clearSession } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import { ChevronLeft, Loader2, Users, Heart, Eye, Home } from "lucide-react";
import ServicesSection from "./ServicesSection";
import WalletSheet from "./WalletSheet";
import ShopSheet from "./ShopSheet";
import VipShopSheet from "./VipShopSheet";
import AgencyEntryScreen from "./AgencyEntryScreen";
import VisitsSheet from "./VisitsSheet";
import SupportSheet from "./SupportSheet";
import VerificationSheet from "./VerificationSheet";
import RelationsSheet from "./RelationsSheet";
import LevelSheet from "./LevelSheet";
import SupporterSheet from "./SupporterSheet";
import LegendSheet from "./LegendSheet";
import MissionsSheet from "./MissionsSheet";
import SupporterVipSheet from "./SupporterVipSheet";
import LanguageSheet from "./LanguageSheet";
import ProfilePage from "./ProfilePage";
import AdminPanelSheet from "./AdminPanelSheet";
import MedalsSheet from "./MedalsSheet";

interface Props {
  onEnterRoom?: (roomId: any) => void;
}

export default function MeTab({ onEnterRoom }: Props) {
  const token = getActiveToken();
  const me = useQuery(api.auth.me, { tokenOverride: token });
  const profile = useQuery(
    api.profiles.getById,
    me?._id ? { userId: me._id } : "skip" as any,
  );

  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMedals, setShowMedals] = useState(false);
  const [showVip, setShowVip] = useState(false);
  const [showAgency, setShowAgency] = useState<null | "host" | "agent">(null);
  const [showVisits, setShowVisits] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showSupporter, setShowSupporter] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showSupporterVip, setShowSupporterVip] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  // [moorawi-nav] Back button closes each overlay
  useBackButton(showFullProfile, () => setShowFullProfile(false));
  useBackButton(showWallet, () => setShowWallet(false));
  useBackButton(showShop, () => setShowShop(false));
  useBackButton(showAdmin, () => setShowAdmin(false));
  useBackButton(showMedals, () => setShowMedals(false));
  useBackButton(showVip, () => setShowVip(false));
  useBackButton(showAgency !== null, () => setShowAgency(null));
  useBackButton(showVisits, () => setShowVisits(false));
  useBackButton(showSupport, () => setShowSupport(false));
  useBackButton(showVerify, () => setShowVerify(false));
  useBackButton(showRelations, () => setShowRelations(false));
  useBackButton(showLevel, () => setShowLevel(false));
  useBackButton(showSupporter, () => setShowSupporter(false));
  useBackButton(showLegend, () => setShowLegend(false));
  useBackButton(showMissions, () => setShowMissions(false));
  useBackButton(showSupporterVip, () => setShowSupporterVip(false));
  useBackButton(showLanguage, () => setShowLanguage(false));

  if (!me) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  // Full Profile overlay (الصورة 2)
  if (showFullProfile) {
    return (
      <ProfilePage
        userId={me._id}
        isMe={true}
        onClose={() => setShowFullProfile(false)}
        onOpenOwnerPanel={() => {
          setShowFullProfile(false);
          setShowAdmin(true);
        }}
        onOpenAdminPanel={() => {
          setShowFullProfile(false);
          setShowAdmin(true);
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-full bg-gradient-to-b from-slate-900 to-black">
        {/* ===== Top: user mini header ===== */}
        <button
          onClick={() => setShowFullProfile(true)}
          className="w-full px-4 pt-4 pb-3 flex items-center gap-3 hover:bg-white/5 transition active:bg-white/10"
        >
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src={profile?.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-white font-black text-base truncate">{me.name || "—"}</p>
            <p className="text-white/60 text-xs" dir="ltr">ID:{me.userNumber}</p>
          </div>
          <ChevronLeft size={20} className="text-white/40" />
        </button>

        {/* ===== Stats (visitors / fans / following) ===== */}
        <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-3">
          <StatBox
            icon={Eye}
            label="الزوار"
            value={(profile as any)?.visitorCount ?? 0}
            onClick={() => setShowFullProfile(true)}
          />
          <StatBox
            icon={Heart}
            label="المعجبين"
            value={(profile as any)?.fanCount ?? 0}
            onClick={() => setShowFullProfile(true)}
          />
          <StatBox
            icon={Users}
            label="المتابعين"
            value={(profile as any)?.followerCount ?? 0}
            onClick={() => setShowFullProfile(true)}
          />
        </div>

        {/* ===== Services section (8 grid + list) ===== */}
        <ServicesSection
          onOpenWallet={() => setShowWallet(true)}
          onOpenStore={() => setShowShop(true)}
          onOpenMedals={() => setShowMedals(true)}
          onOpenMissions={() => setShowMissions(true)}
          onOpenVip={() => setShowVip(true)}
          onOpenHost={() => setShowAgency("host")}
          onOpenAgency={() => setShowAgency("agent")}
          onOpenVisits={() => setShowVisits(true)}
          onOpenSupport={() => setShowSupport(true)}
          onOpenVerify={() => setShowVerify(true)}
          onOpenRelations={() => setShowRelations(true)}
          onOpenLevel={() => setShowLevel(true)}
          onOpenSupporter={() => setShowSupporter(true)}
          onOpenLegend={() => setShowLegend(true)}
          onOpenSupporterVip={() => setShowSupporterVip(true)}
          onOpenLanguage={() => setShowLanguage(true)}
          onLogout={() => {
            dialog.confirm(
              "هل تريد تسجيل الخروج من الحساب؟",
              () => {
                clearSession();
                window.location.reload();
              },
              "تسجيل الخروج",
              "خروج"
            );
          }}
          isOwner={me.userNumber === 1 || me.adminRole === "super"}
          onOpenAdmin={() => setShowAdmin(true)}
        />

        <div className="h-24" />
      </div>

      {/* ===== Overlays ===== */}
      {showWallet && <WalletSheet onClose={() => setShowWallet(false)} />}
      {showShop && <ShopSheet onClose={() => setShowShop(false)} />}
      {showAdmin && <AdminPanelSheet onClose={() => setShowAdmin(false)} />}
      {showMedals && <MedalsSheet onClose={() => setShowMedals(false)} />}
      {showVip && <VipShopSheet onClose={() => setShowVip(false)} />}
      {showAgency && <AgencyEntryScreen initialTab={showAgency} onClose={() => setShowAgency(null)} />}
      {showVisits && <VisitsSheet onClose={() => setShowVisits(false)} />}
      {showSupport && <SupportSheet onClose={() => setShowSupport(false)} />}
      {showVerify && <VerificationSheet onClose={() => setShowVerify(false)} />}
      {showRelations && <RelationsSheet onClose={() => setShowRelations(false)} />}
      {showLevel && <LevelSheet onClose={() => setShowLevel(false)} />}
      {showSupporter && <SupporterSheet onClose={() => setShowSupporter(false)} />}
      {showLegend && <LegendSheet onClose={() => setShowLegend(false)} />}
      {showMissions && <MissionsSheet onClose={() => setShowMissions(false)} />}
      {showSupporterVip && <SupporterVipSheet onClose={() => setShowSupporterVip(false)} />}
      {showLanguage && <LanguageSheet onClose={() => setShowLanguage(false)} />}
    </>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: any;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-3 active:bg-white/5 transition rounded-2xl"
    >
      <Icon size={18} className="text-white/60" />
      <p className="text-white text-base font-black tabular-nums" dir="ltr">{value}</p>
      <p className="text-white/50 text-[10px]">{label}</p>
    </button>
  );
}
