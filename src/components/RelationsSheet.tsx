// [moorawi-services] العلاقة (CP)
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import VipAvatar from "./ui/VipAvatar";
import { Header, Spinner, Empty } from "./VisitsSheet";
import { Heart, Users, Star } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

export default function RelationsSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const relations = useQuery(api.relationships.myRelations, { tokenOverride: deviceId } as any);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="العلاقة (CP)" assetKey="ui.sheet.relation" />
      <div className="flex-1 overflow-y-auto p-4">
        {relations === undefined ? (
          <Spinner />
        ) : relations.length === 0 ? (
          <Empty icon={Heart} text="لا توجد علاقات بعد" />
        ) : (
          <div className="space-y-3">
            {relations.map((r: any) => (
              <button
                key={r._id}
                onClick={() => onUserClick?.(r.partner.userId)}
                className="w-full rounded-2xl bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-400/30 p-4 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-700 border-2 border-pink-400/50 flex items-center justify-center">
                    <VipAvatar src={r.partner.avatarUrl} name={r.partner.name} size={44} vip={(r.partner as any).vip ?? 0} />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-white text-sm font-black">{r.partner.name}</p>
                    <p className="text-white/50 text-[10px]" dir="ltr">ID:{r.partner.userNumber ?? "—"}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[9px] font-black">
                        {r.type === "cp" ? "CP" : r.type === "trueLove" ? "حبيب" : r.type === "bestFriend" ? "أفضل صديق" : r.type}
                      </span>
                      <span className="text-pink-300 text-[10px] flex items-center gap-0.5">
                        <Heart size={9} fill="currentColor" /> {r.loveScore ?? 0}
                      </span>
                    </div>
                  </div>
                  <Star size={18} className="text-pink-300" fill="currentColor" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
