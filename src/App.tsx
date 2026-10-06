import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import RoomList from "./components/RoomList";
import RoomView from "./components/RoomView";
import Onboarding from "./components/Onboarding";
import { getDeviceId } from "./lib/device";
import { Loader2 } from "lucide-react";

function App() {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (me === undefined) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 overflow-hidden">
        <Loader2 className="animate-spin text-white" size={48} />
      </div>
    );
  }

  if (me && !me.profileComplete) {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900" dir="rtl">
        <Onboarding onComplete={() => setRefreshKey((k) => k + 1)} />
      </div>
    );
  }

  return (
    <div key={refreshKey} className="h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900" dir="rtl">
      {currentRoomId ? (
        <RoomView roomId={currentRoomId} onLeave={() => setCurrentRoomId(null)} />
      ) : (
        <div className="h-full w-full overflow-y-auto">
          <RoomList onEnter={setCurrentRoomId} />
        </div>
      )}
    </div>
  );
}

export default App;
