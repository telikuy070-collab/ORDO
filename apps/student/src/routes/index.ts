import { createRouter } from '@tanstack/react-router';

import { Route as IndexRoute } from './index-page';
import { RootRoute } from './root';
import { Route as ScheduleRoute } from './schedule';

export const router = createRouter({
  routeTree: RootRoute.addChildren([IndexRoute, ScheduleRoute]),
});

export const routeTree = router.routeTree;
