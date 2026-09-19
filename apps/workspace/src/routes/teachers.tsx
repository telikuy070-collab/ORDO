import { createRoute } from '@tanstack/react-router';

import { PageHeader } from '@ordo/ui';

import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/teachers',
  component: TeachersPage,
});

function TeachersPage() {
  return (
    <div>
      <PageHeader title="Преподаватели" description="Управление преподавателями" />
      <p className="text-text-secondary">Страница преподавателей.</p>
    </div>
  );
}