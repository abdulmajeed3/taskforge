/**
 * Typed API client for TaskForge.
 *
 * - Access token is kept in module memory (never localStorage).
 * - Selected org is persisted to localStorage.
 * - On 401, refreshes the access token once then retries.
 * - Unwraps the { success, data } response envelope automatically.
 */

const BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000/api/v1';

// ---- token / org state --------------------------------------------------

let _accessToken: string | null = null;
let _orgId: string | null = null;

try {
  _orgId = localStorage.getItem('tf:org');
} catch {
  /* private window / cookie blocked */
}

export function setAccessToken(t: string | null): void {
  _accessToken = t;
}
export function getAccessToken(): string | null {
  return _accessToken;
}
export function setOrgId(id: string | null): void {
  _orgId = id;
  try {
    if (id) localStorage.setItem('tf:org', id);
    else localStorage.removeItem('tf:org');
  } catch {/* ignore */}
}
export function getOrgId(): string | null {
  return _orgId;
}

// ---- error type ---------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- internal refresh (avoids circular import with auth.ts) -------------

async function doRefresh(): Promise<string> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('refresh failed');
  const body = (await res.json()) as { data?: { accessToken?: string }; accessToken?: string };
  const token = body.data?.accessToken ?? (body as Record<string, string>)['accessToken'];
  if (!token) throw new Error('no token in refresh response');
  return token;
}

// ---- core fetch ---------------------------------------------------------

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipOrgHeader?: boolean;
}

async function rawFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const { skipAuth, skipOrgHeader, ...init } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (!skipAuth && _accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  if (!skipOrgHeader && _orgId) headers['X-Organization-Id'] = _orgId;

  return fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, opts);

  // Token expired — attempt one refresh + retry
  if (res.status === 401 && !opts.skipAuth) {
    try {
      const newToken = await doRefresh();
      setAccessToken(newToken);
    } catch {
      setAccessToken(null);
      // Redirect to login on next tick so React renders cleanly
      setTimeout(() => { window.location.href = '/login'; }, 0);
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
    res = await rawFetch(path, opts);
  }

  if (res.status === 204) return null as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `HTTP ${res.status}`,
      err?.details,
    );
  }

  // Unwrap the { success, data } envelope
  if (body && typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

// ---- public helpers (used by api/*.ts) ----------------------------------

export const api = {
  get<T>(path: string, opts?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...opts, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, opts?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...opts, method: 'POST', body: body != null ? JSON.stringify(body) : undefined });
  },
  patch<T>(path: string, body?: unknown, opts?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...opts, method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined });
  },
  delete<T>(path: string, opts?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...opts, method: 'DELETE' });
  },
};
