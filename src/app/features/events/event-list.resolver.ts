import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, map, mapTo } from 'rxjs';
import { EventStore } from '../../core/stores/event.store';

@Injectable({ providedIn: 'root' })
export class EventListResolver implements Resolve<boolean> {
  constructor(private store: EventStore) {}

  resolve(): Observable<boolean> {
    // Set initialized of Store to true so that the filter effects use it
    this.store.init();

    // Resolver waits until events are actually loaded
    return this.store.loadEvents$().pipe(map(() => true));
  }
}
