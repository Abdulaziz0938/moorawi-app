// [moorawi-services] الزيارات الأخيرة
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { ChevronRight, Loader2, Clock, Eye, User } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

export default function VisitsSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const visits = useQuery(api.visits.recent, { tokenOverride: deviceId } as any);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الزيارات الأخيرة" icon={Eye} assetKey="ui.sheet.visits" />
      <div className="flex-1 overflow-y-auto p-4">
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
                  <UserAvatar avatarUrl={v.avatarUrl} name={v.name} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white text-sm font-black truncate">{v.name ?? "—"}</p>
                  <p className="text-white/40 text-[10px]" dir="ltr">ID:{v.userNumber ?? "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Clock size={11} className="text-white/40" />
                  <span className="text-white/40 text-[9px]">
                    {new Date(v._creationTime).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
