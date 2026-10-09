// [moorawi-auth] Session token management
const SESSION_KEY = "moorawi_session_token";
const USERNAME_KEY = "moorawi_session_username";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSession(sessionToken: string, username: string): void {
  try {
    localStorage.setItem(SESSION_KEY, sessionToken);
    localStorage.setItem(USERNAME_KEY, username);
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch {}
}

export function getSessionUsername(): string | null {
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return !!getSessionToken();
}

// Returns the token to use for backend calls:
// - session token if logged in
// - device ID if guest
export function getActiveToken(): string {
  const session = getSessionToken();
  if (session) return session;
  // fallback to device id
  const KEY = "moorawi_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}
