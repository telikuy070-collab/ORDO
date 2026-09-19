import { createRoute } from '@tanstack/react-router';

import { PageHeader } from '@ordo/ui';

import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/groups',
  component: GroupsPage,
});

function GroupsPage() {
  return (
    <div>
      <PageHeader title="Группы" description="Управление учебными группами" />
      <p className="text-text-secondary">Страница групп.</p>
    </div>
  );
}