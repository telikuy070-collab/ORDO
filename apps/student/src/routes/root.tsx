import { createRootRoute, Outlet } from '@tanstack/react-router';
import React from 'react';

import { LanguageSwitcher, useI18n } from '@ordo/i18n';
import { AppShell } from '@ordo/ui';

export const RootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { t } = useI18n();

  return (
    <AppShell
      nav={[{ label: t('nav.schedule'), href: '/schedule' }]}
      user={{ name: t('common.student'), role: 'anon', logoutLabel: t('logout') }}
      headerExtra={<LanguageSwitcher />}
    >
      <Outlet />
    </AppShell>
  );
}
