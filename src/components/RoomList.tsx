import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Mic, Users, Plus, X, Check, Home } from "lucide-react";
import { getDeviceId } from "../lib/device";
import { clearSession, hasSession } from "../lib/session";
import { LogOut } from "lucide-react";
import { dialog } from "../lib/dialog";

interface Props {
  onEnter: (roomId: Id<"rooms">) => void;
}

export default function RoomList({ onEnter }: Props) {
  const deviceId = getDeviceId();

  const handleLogout = () => {
    dialog.confirm("تسجيل الخروج من الحساب؟", () => {
      clearSession();
      window.location.reload();
    });
  };
  const rooms = useQuery(api.rooms.listPublic);
  const myRoom = useQuery(api.rooms.myRoom, { tokenOverride: deviceId });
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom({ name: newName.trim(), isPrivate: false, tokenOverride: deviceId });
      setNewName(""); setShowCreate(false); onEnter(roomId);
    } catch (e: any) { dialog.alert(e.message || "خطأ"); }
    finally { setIsCreating(false); }
  };

  const handleJoin = async (roomId: Id<"rooms">) => {
    try {
      await joinRoom({ roomId, tokenOverride: deviceId });
      onEnter(roomId);
    } catch (e: any) { dialog.alert(e.message || "خطأ"); }
  };

  const handleCopyId = async () => {
    if (!me?.userNumber) return;
    const value = String(me.userNumber);
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-md mx-auto p-4 relative">
      {/* [moorawi-auth] Logout — يظهر فقط عند تسجيل دخول رسمي */}
      {hasSession() && (
        <button
          onClick={handleLogout}
          className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white/10 hover:bg-red-500/30 backdrop-blur-xl border border-white/20 text-white/70 hover:text-white transition"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      )}

      <header className="text-center py-6 text-white">
        {me && (
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center mb-2">
              {me.avatarUrl ? (
                <img src={me.avatarUrl} alt="me" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{me.name?.[0] || "?"}</span>
              )}
            </div>
            <p className="font-bold text-lg">{me.name}</p>
            <p className="text-xs opacity-70" dir="ltr">@{me.username}</p>
            {me.userNumber && (
              <button
                onClick={handleCopyId}
                className="mt-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full transition active:scale-95 flex items-center gap-2"
                title="اضغط لنسخ المعرف"
              >
                <span className="text-xs font-bold" dir="ltr">ID: {me.userNumber}</span>
                {copied && <Check size={14} className="text-green-300" />}
              </button>
            )}
          </div>
        )}
      </header>

      {/* [moorawi-rooms] زر ديناميكي: Home + (+) إن لم توجد غرفة / Home فقط إن وُجدت */}
      {myRoom ? (
        <button
          onClick={() => onEnter(myRoom._id)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 mb-4 font-bold transition shadow-lg active:scale-95"
        >
          <Home size={20} /> غرفتي
        </button>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl flex items-center justify-center gap-2 mb-4 font-bold transition active:scale-95 relative"
        >
          <div className="relative">
            <Home size={22} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-purple-900">
              <Plus size={10} className="text-white" strokeWidth={3} />
            </div>
          </div>
          إنشاء غرفة جديدة
        </button>
      )}

      <div className="space-y-3">
        {rooms === undefined ? (
          <p className="text-white text-center">جاري التحميل...</p>
        ) : rooms.length === 0 ? (
          <p className="text-white text-center opacity-70">لا توجد غرف حالياً. كن أول من ينشئ غرفة!</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room._id}
              onClick={() => handleJoin(room._id)}
              className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl cursor-pointer flex items-center justify-between transition"
            >
              <div>
                <p className="font-bold">{room.name}</p>
                <p className="text-xs opacity-70 flex items-center gap-1 mt-1">
                  <Users size={14} /> {room.memberCount} عضو
                </p>
              </div>
              <div className="bg-purple-600 rounded-full p-2"><Mic size={20} /></div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">غرفة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500"><X /></button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الغرفة"
              className="w-full border-2 border-gray-200 rounded-lg p-3 mb-4 focus:border-purple-500 outline-none text-gray-800"
              maxLength={40}
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
