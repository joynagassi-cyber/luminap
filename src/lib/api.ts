/**
 * API client for server-side authentication and transaction operations.
 * All calls go through the Nitro server which enforces auth and authorization.
 */

const API_BASE = '/api';

interface SessionUser {
  id: string;
  email: string;
  role: string;
  organization: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = sessionStorage.getItem('lumina_session_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-session-token': token } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: (err as { statusMessage?: string }).statusMessage ?? `HTTP ${res.status}` };
  }

  const data = await res.json();
  return { ok: true, data };
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: SessionUser; sessionToken: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    getSession: () => request<{ authenticated: boolean; user?: SessionUser }>('/auth/session'),
    logout: () => request<{ ok: boolean }>('/auth/session', { method: 'DELETE' }),
  },

  transactions: {
    list: (params?: { status?: string; type?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.type) query.set('type', params.type);
      return request<{ transactions: any[] }>(`/transactions${query.toString() ? `?${query}` : ''}`);
    },
    get: (id: string) => request<{ transaction: any }>(`/transactions/${id}`),
    create: (tx: any) => request<{ ok: boolean; transaction: any }>('/transactions', { method: 'POST', body: JSON.stringify(tx) }),
    update: (id: string, updates: any) =>
      request<{ ok: boolean; transaction: any }>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) =>
      request<{ ok: boolean; deleted: string }>(`/transactions/${id}`, { method: 'DELETE' }),
    action: (id: string, action: 'approve' | 'reject' | 'submit', extra?: Record<string, unknown>) =>
      request<{ ok: boolean; transaction: any }>(`/transactions/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      }),
  },
};

/** Get or restore session token from sessionStorage */
export function getSessionToken(): string | null {
  return sessionStorage.getItem('lumina_session_token');
}

/** Store session token after login */
export function setSessionToken(token: string): void {
  sessionStorage.setItem('lumina_session_token', token);
}

/** Clear session on logout */
export function clearSession(): void {
  sessionStorage.removeItem('lumina_session_token');
}
