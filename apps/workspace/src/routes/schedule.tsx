import { createRoute } from '@tanstack/react-router';

import { PageHeader } from '@ordo/ui';

import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/schedule',
  component: SchedulePage,
});

function SchedulePage() {
  return (
    <div>
      <PageHeader title="Расписание" description="Управление учебным расписанием" />
      <p className="text-text-secondary">Страница расписания.</p>
    </div>
  );
}