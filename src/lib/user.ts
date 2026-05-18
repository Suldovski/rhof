const USER_NAME_KEY = "bucagrans.user.name.v1";
const AUTH_KEY = "bucagrans.auth.v1";
const FALLBACK_USER_NAME = "Carla";

function readNameFromAuthStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      currentUserId?: string | null;
      users?: Array<{ id: string; name?: string }>;
    };
    const current = parsed.users?.find((u) => u.id === parsed.currentUserId);
    return current?.name?.trim() || null;
  } catch {
    return null;
  }
}

export function getUserName(): string {
  if (typeof window === "undefined") return FALLBACK_USER_NAME;

  const fromAuth = readNameFromAuthStorage();
  if (fromAuth) {
    localStorage.setItem(USER_NAME_KEY, fromAuth);
    return fromAuth;
  }

  const fromStorage = localStorage.getItem(USER_NAME_KEY)?.trim();
  return fromStorage || FALLBACK_USER_NAME;
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  const clean = name.trim();
  if (!clean) return;
  localStorage.setItem(USER_NAME_KEY, clean);
}
