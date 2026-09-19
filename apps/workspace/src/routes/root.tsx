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
        { label: 'Преподаватели', href: '/teachers' },
        { label: 'Группы', href: '/groups' },
        { label: 'Импорт/Экспорт', href: '/import-export' },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}