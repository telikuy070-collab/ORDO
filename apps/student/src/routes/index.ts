import { createRouter } from '@tanstack/react-router';

import { RootRoute } from './root';
import { Route as ScheduleRoute } from './schedule';

export const router = createRouter({
  routeTree: RootRoute.addChildren([ScheduleRoute]),
});

export const routeTree = router.routeTree;