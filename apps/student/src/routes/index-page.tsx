import { createRoute, redirect } from '@tanstack/react-router';

import { RootRoute } from './root';

// The public app is reached at the domain root, so `/` must land on the
// schedule instead of rendering a 404.
export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/schedule' });
  },
});
