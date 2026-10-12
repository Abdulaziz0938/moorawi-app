// [ezo-messages] إشعارات النظام من Ezo
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import { Loader2, Bell, Check, CheckCheck } from "lucide-react";

interface Props { onClose: () => void; }

export default function SystemNotifSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const notifs = useQuery(api.notifications.listMine, { tokenOverride: deviceId });
  const markRead = useMutation(api.notifications.markRead);

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="رسائل النظام" assetKey="ui.sheet.notif" />

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {notifs === undefined ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/40" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Bell size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد رسائل</p>
          </div>
        ) : (
          notifs.map((n: any) => (
            <button
              key={n._id}
              onClick={() => {
                if (!n.readAt) markRead({ notificationId: n._id, tokenOverride: deviceId });
                // Action handling
                if (n.actionType === "open_rooms") window.location.hash = "#rooms";
              }}
              className={`w-full rounded-2xl border p-4 text-right transition ${
                n.readAt ? "bg-white/5 border-white/10" : "bg-blue-500/10 border-blue-400/40"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-white/40 text-[10px]" dir="ltr">
                  {new Date(n.createdAt).toLocaleString("ar-EG")}
                </span>
                <div className="flex items-center gap-1.5">
                  {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  <p className="text-white text-sm font-black">{n.title}</p>
                </div>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">{n.body}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
