import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken, clearSession } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import { ChevronLeft, Loader2, Users, Heart, Eye, Home } from "lucide-react";
import ServicesSection from "./ServicesSection";
import WalletSheet from "./WalletSheet";
import GiftHistorySheet from "./GiftHistorySheet";
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
import UserSettingsSheet from "./UserSettingsSheet";
import ProfilePage from "./ProfilePage";
import AdminPanelSheet from "./AdminPanelSheet";
import MedalsSheet from "./MedalsSheet";
import Card from "./ui/Card";
import StatBadge from "./ui/StatBadge";
import VipAvatar from "./ui/VipAvatar";

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
  const [showGiftHistory, setShowGiftHistory] = useState(false);
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
  const [showUserSettings, setShowUserSettings] = useState(false);

  // [moorawi-global] ربط زر الشحن من GiftSheet
  useEffect(() => {
    (window as any).__ezo_openWallet = () => setShowWallet(true);
    return () => { delete (window as any).__ezo_openWallet; };
  }, []);

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
  useBackButton(showUserSettings, () => setShowUserSettings(false));

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
        onOpenVisits={() => setShowVisits(true)}
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
<VipAvatar
              src={profile?.avatarUrl}
              name={me.name || "?"}
              size={56}
              vip={(profile as any)?.vip ?? 0}
              ring={true}
            />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-white font-black text-base truncate">{me.name || "—"}</p>
            <p className="text-white/60 text-xs" dir="ltr">ID:{me.userNumber}</p>
          </div>
          <ChevronLeft size={20} className="text-white/40" />
        </button>

        {/* ===== Stats (visitors / fans / following) ===== */}
          <div className="mx-4 mt-2 grid grid-cols-3 gap-2">
            <button onClick={() => setShowFullProfile(true)} className="w-full text-right active:scale-95 transition">
              <StatBadge icon={Eye} label="الزوار" value={(profile as any)?.visitorCount ?? 0} tone="default" size="sm" />
            </button>
            <button onClick={() => setShowFullProfile(true)} className="w-full text-right active:scale-95 transition">
              <StatBadge icon={Heart} label="المعجبين" value={(profile as any)?.fanCount ?? 0} tone="pink" size="sm" />
            </button>
            <button onClick={() => setShowFullProfile(true)} className="w-full text-right active:scale-95 transition">
              <StatBadge icon={Users} label="المتابعين" value={(profile as any)?.followerCount ?? 0} tone="purple" size="sm" />
            </button>
          </div>

        {/* ===== Services section (8 grid + list) ===== */}
        <ServicesSection
          onOpenWallet={() => setShowWallet(true)}
          onOpenGiftHistory={() => setShowGiftHistory(true)}
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
          onOpenSettings={() => setShowUserSettings(true)}
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
      {showGiftHistory && <GiftHistorySheet onClose={() => setShowGiftHistory(false)} />}
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
      {showUserSettings && (
        <UserSettingsSheet
          onClose={() => setShowUserSettings(false)}
          onOpenLanguage={() => { setShowUserSettings(false); setShowLanguage(true); }}
          onOpenVerify={() => { setShowUserSettings(false); setShowVerify(true); }}
          onOpenProfile={() => { setShowUserSettings(false); setShowFullProfile(true); }}
          onOpenSupport={() => { setShowUserSettings(false); setShowSupport(true); }}
          onLogout={() => {
            dialog.confirm("تسجيل الخروج؟", () => { clearSession(); window.location.reload(); }, "خروج", "خروج");
          }}
        />
      )}
    </>
  );
}

