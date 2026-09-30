import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '@ordo/domain';
import { UserRole } from '@ordo/domain';
import { SupabaseAuthProvider, getSupabaseClient } from '@ordo/infrastructure';

export interface SessionState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const { data } = await getSupabaseClient().auth.getSession();

        if (!active) return;

        if (!data.session) {
          setUser(null);
          return;
        }

        // Re-derive the profile instead of trusting cached token data: the
        // tenant binding lives in user_roles and can change server-side.
        const restored = await new SupabaseAuthProvider().validateToken(
          data.session.access_token,
        );

        if (active) setUser(restored);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: signedIn } = await new SupabaseAuthProvider().login(email, password);
    setUser(signedIn);
  }, []);

  const logout = useCallback(async () => {
    try {
      await new SupabaseAuthProvider().logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<SessionState>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return ctx;
}

/** Convenience guard used by routes that require an authenticated staff user. */
export function useIsTenantAdmin(): boolean {
  return useSession().user?.role === UserRole.TenantAdmin;
}
