const credentials: RequestCredentials = "include";

export async function checkAdminSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", { credentials });
    if (!res.ok) return false;
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function adminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials,
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok && data.success) {
    return { success: true };
  }

  return { success: false, error: data.error || "Ошибка авторизации" };
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST", credentials });
}

export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, credentials });
}
