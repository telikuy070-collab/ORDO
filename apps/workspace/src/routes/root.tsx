import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { AppShell, Spinner } from '@ordo/ui';

import { useSession } from '../auth/session';

export const RootRoute = createRootRoute({
  component: RootComponent,
});

const PUBLIC_ROUTES = new Set(['/login']);

function RootComponent() {
  const { user, loading, logout } = useSession();
  const navigate = useNavigate();
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublic = PUBLIC_ROUTES.has(path);

  useEffect(() => {
    if (loading || isPublic) return;
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [loading, user, isPublic, navigate]);

  if (loading && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AppShell
      nav={[
        { label: 'Расписание', href: '/schedule' },
        { label: 'Сотрудники', href: '/users' },
        { label: 'Группы', href: '/groups' },
        { label: 'Импорт/Экспорт', href: '/import-export' },
      ]}
      user={
        user
          ? {
              name: user.name || user.email,
              role: user.role,
              onLogout: () => {
                void logout();
              },
            }
          : undefined
      }
    >
      <Outlet />
    </AppShell>
  );
}
