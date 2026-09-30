import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { LanguageSwitcher, useI18n } from '@ordo/i18n';
import { AppShell, Spinner } from '@ordo/ui';

import { useSession } from '../auth/session';

export const RootRoute = createRootRoute({
  component: RootComponent,
});

const PUBLIC_ROUTES = new Set(['/login']);

function RootComponent() {
  const { user, loading, logout } = useSession();
  const { t } = useI18n();
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
        { label: t('nav.schedule'), href: '/schedule' },
        { label: t('nav.users'), href: '/users' },
        { label: t('nav.teachers'), href: '/teachers' },
        { label: t('nav.groups'), href: '/groups' },
        { label: t('nav.importExport'), href: '/import-export' },
      ]}
      user={
        user
          ? {
              name: user.name || user.email,
              role: user.role,
              logoutLabel: t('logout'),
              onLogout: () => {
                void logout();
              },
            }
          : undefined
      }
      headerExtra={<LanguageSwitcher />}
    >
      <Outlet />
    </AppShell>
  );
}
