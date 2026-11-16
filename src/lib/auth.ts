import { getApiBaseUrl } from "./api";

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  /** True khi đăng nhập demo (BE không kết nối được) — chỉ dữ liệu mẫu. */
  demo: boolean;
}

const AUTH_KEY = "nowevent_auth";

/** Tài khoản demo duy nhất — chỉ dùng khi BE không kết nối được. */
export const DEMO_EMAIL = "admin@nowevent.local";
export const DEMO_PASSWORD = "demo123";

function readStored(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY) ?? window.sessionStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.token && parsed.user?.email ? parsed : null;
  } catch {
    return null;
  }
}

export function getAuth(): AuthSession | null {
  return readStored();
}

function saveAuth(session: AuthSession, remember: boolean): void {
  const raw = JSON.stringify(session);
  if (remember) {
    window.localStorage.setItem(AUTH_KEY, raw);
    window.sessionStorage.removeItem(AUTH_KEY);
  } else {
    window.sessionStorage.setItem(AUTH_KEY, raw);
    window.localStorage.removeItem(AUTH_KEY);
  }
}

export function logout(): void {
  window.localStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(AUTH_KEY);
}

interface LoginResponse {
  token: string;
  user: { name: string; email: string; role: string };
}

/**
 * Đăng nhập qua BE: POST {API}/auth/login (đầy đủ là /api/auth/login).
 * - BE trả 200 + {token, user} → lưu session, trả về session.
 * - BE trả 401 → sai email hoặc mật khẩu.
 * - Không kết nối được tới BE → chỉ tài khoản demo mới đăng nhập được
 *   (phiên demo, chỉ dữ liệu mẫu); tài khoản khác báo lỗi kết nối.
 */
export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthSession> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // BE không kết nối được — chỉ cho đăng nhập demo.
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const demo: AuthSession = {
        token: "demo-token",
        user: { name: "Quản trị viên (Demo)", email: DEMO_EMAIL, role: "admin" },
        demo: true,
      };
      saveAuth(demo, remember);
      return demo;
    }
    throw new Error(
      "Không kết nối được tới BE. Kiểm tra lại API Base URL ở trang Cài đặt — hoặc đăng nhập demo bằng tài khoản demo.",
    );
  }

  if (res.status === 401) {
    throw new Error("Sai email hoặc mật khẩu. Vui lòng thử lại.");
  }
  if (!res.ok) {
    let message = `BE trả lỗi ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message ?? body?.message ?? message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as LoginResponse;
  if (!data.token || !data.user?.email) {
    throw new Error("BE trả response đăng nhập không hợp lệ (thiếu token/user).");
  }
  const session: AuthSession = { token: data.token, user: data.user, demo: false };
  saveAuth(session, remember);
  return session;
}
