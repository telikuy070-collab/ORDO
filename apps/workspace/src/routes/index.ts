import { createRouter } from '@tanstack/react-router';

import { Route as GroupsRoute } from './groups';
import { Route as ImportExportRoute } from './import-export';
import { RootRoute } from './root';
import { Route as ScheduleRoute } from './schedule';
import { Route as TeachersRoute } from './teachers';

export const router = createRouter({
  routeTree: RootRoute.addChildren([
    ScheduleRoute,
    TeachersRoute,
    GroupsRoute,
    ImportExportRoute,
  ]),
});

export const routeTree = router.routeTree;