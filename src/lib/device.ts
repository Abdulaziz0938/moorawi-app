// Generates a unique device ID stored in localStorage.
export function getDeviceId(): string {
  const KEY = "moorawi_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}
