import { createRoute } from '@tanstack/react-router';

import { PageHeader } from '@ordo/ui';

import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/import-export',
  component: ImportExportPage,
});

function ImportExportPage() {
  return (
    <div>
      <PageHeader title="Импорт / Экспорт" description="Импорт расписания из Excel и экспорт в Excel/CSV" />
      <p className="text-text-secondary">Страница импорта и экспорта.</p>
    </div>
  );
}