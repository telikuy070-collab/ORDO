import { createRouter } from '@tanstack/react-router';

import { Route as GroupsRoute } from './groups';
import { Route as ImportExportRoute } from './import-export';
import { Route as LoginRoute } from './login';
import { RootRoute } from './root';
import { Route as ScheduleRoute } from './schedule';
import { Route as ScheduleEditorRoute } from './schedule-editor';
import { Route as TeachersRoute } from './teachers';
import { Route as UsersRoute } from './users';

export const router = createRouter({
  routeTree: RootRoute.addChildren([
    LoginRoute,
    ScheduleRoute,
    ScheduleEditorRoute,
    TeachersRoute,
    UsersRoute,
    GroupsRoute,
    ImportExportRoute,
  ]),
});

export const routeTree = router.routeTree;
