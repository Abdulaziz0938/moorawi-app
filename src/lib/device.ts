// [moorawi-auth] Returns the active token:
// - session token if user is logged in
// - device id if guest
export function getDeviceId(): string {
  // 1) Session priority
  try {
    const session = localStorage.getItem("moorawi_session_token");
    if (session) return session;
  } catch {}

  // 2) Fallback: device id (guest)
  const KEY = "moorawi_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}
