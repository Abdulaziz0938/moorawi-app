import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { ChevronLeft, Loader2, Users, Heart, Eye, Home } from "lucide-react";
import ServicesSection from "./ServicesSection";
import WalletSheet from "./WalletSheet";
import ShopSheet from "./ShopSheet";
import VipShopSheet from "./VipShopSheet";
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
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl font-black">{me.name?.[0] || "?"}</span>
            )}
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
          onOpenVip={() => setShowVip(true)}
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
