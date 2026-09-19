import { createRootRoute, Outlet } from '@tanstack/react-router';
import React from 'react';

import { AppShell } from '@ordo/ui';

export const RootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppShell
      nav={[
        { label: 'Расписание', href: '/schedule' },
      ]}
      user={{ name: 'Студент', role: 'anon' }}
    >
      <Outlet />
    </AppShell>
  );
}