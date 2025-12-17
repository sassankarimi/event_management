import { Routes } from '@angular/router';

/**
 * Top-level application routes. The root path lazily loads
 * the event feature module defined in a later phase.
 */
export const appRoutes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/events/event.routes').then((m) => m.EVENT_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
