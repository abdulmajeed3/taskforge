import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAccessToken, setOrgId, getOrgId } from '../api/client';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import type { User, OrgMembership } from '../api/types';

interface AuthState {
  user: User | null;
  memberships: OrgMembership[];
  currentOrgId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, firstName: string, lastName: string): Promise<void>;
  logout(): Promise<void>;
  switchOrg(orgId: string): void;
  refreshMemberships(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(getOrgId);
  const [isLoading, setIsLoading] = useState(true);

  const loadMemberships = useCallback(async () => {
    const ms = await usersApi.organizations();
    setMemberships(ms);
    // Auto-select first org if stored one is no longer valid
    const valid = ms.find((m) => m.organizationId === getOrgId());
    if (!valid && ms.length > 0) {
      const first = ms[0]!;
      setOrgId(first.organizationId);
      setCurrentOrgId(first.organizationId);
    } else if (!valid) {
      setOrgId(null);
      setCurrentOrgId(null);
    }
    return ms;
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);
        const me = await usersApi.me();
        if (cancelled) return;
        setUser(me);
        await loadMemberships();
      } catch {
        /* no valid session — stay logged out */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadMemberships]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.accessToken);
    setUser(res.user);
    const ms = await loadMemberships();
    // If they only have one org, auto-select it
    if (ms.length === 1) {
      setOrgId(ms[0]!.organizationId);
      setCurrentOrgId(ms[0]!.organizationId);
    }
  }, [loadMemberships]);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    const res = await authApi.register({ email, password, firstName, lastName });
    setAccessToken(res.accessToken);
    setUser(res.user);
    setMemberships([]);
    setOrgId(null);
    setCurrentOrgId(null);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {/* best-effort */}
    setAccessToken(null);
    setOrgId(null);
    setUser(null);
    setMemberships([]);
    setCurrentOrgId(null);
  }, []);

  const switchOrg = useCallback((orgId: string) => {
    setOrgId(orgId);
    setCurrentOrgId(orgId);
  }, []);

  const refreshMemberships = useCallback(async () => {
    await loadMemberships();
  }, [loadMemberships]);

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        currentOrgId,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchOrg,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
