import { Routes } from '@angular/router';
import { EventListResolver } from './event-list.resolver';

export const EVENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/event-list/event-list.page').then((m) => m.EventListPage),
    resolve: {
      events: EventListResolver,
    },
  },
];
