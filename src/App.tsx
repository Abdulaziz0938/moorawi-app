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

  // Loading state
  if (me === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={48} />
      </div>
    );
  }

  // Show onboarding if profile is incomplete
  if (me && !me.profileComplete) {
    return <Onboarding onComplete={() => setRefreshKey((k) => k + 1)} />;
  }

  return (
    <div key={refreshKey} className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900" dir="rtl">
      {currentRoomId ? (
        <RoomView roomId={currentRoomId} onLeave={() => setCurrentRoomId(null)} />
      ) : (
        <RoomList onEnter={setCurrentRoomId} />
      )}
    </div>
  );
}

export default App;
