import { Injectable, effect, signal } from '@angular/core';
import { EventService } from '../services/event.service';
import { Event, EventStatus } from '../models/event.model';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class EventStore {
  // Reactive state properties
  events = signal<Event[]>([]);
  total = signal(0);
  page = signal(0);
  size = signal(25);
  sortBy = signal<'date' | 'location' | null>(null);
  sortDir = signal<'asc' | 'desc' | null>(null);
  statusFilter = signal<EventStatus | null>(null);
  locationFilter = signal<string | null>(null);
  search = signal('');

  // Date range filters; null means no bound
  dateStart = signal<string | null>(null);
  dateEnd = signal<string | null>(null);
  loading = signal(false);
  private initialized = signal(false);

  private readonly STORAGE_KEY = 'eventFilters';

  init(): void {
    this.initialized.set(true);
  }
  constructor(private service: EventService) {
    // Attempt to restore persisted filter/sort settings from sessionStorage.
    this.loadFiltersFromSession();
    // Trigger load whenever any of the filter signals change.
    effect(() => {
      // erst nach init automatisch reloaden
      if (!this.initialized()) return;

      // jede Filteränderung führt zu reload
      this.loadEvents$().subscribe();
    });
  }

  //Persist the current filter and sort state to sessionStorage.
  private saveFiltersToSession(): void {
    try {
      const data = {
        sortBy: this.sortBy(),
        sortDir: this.sortDir(),
        statusFilter: this.statusFilter(),
        locationFilter: this.locationFilter(),
        search: this.search(),
        dateStart: this.dateStart(),
        dateEnd: this.dateEnd(),
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // If sessionStorage is unavailable (e.g. in private mode), silently
      // ignore persistence to avoid breaking the application.
    }
  }

  /* Load persisted filter and sort settings from sessionStorage. If a stored
  value exists, update the corresponding signals.*/
  private loadFiltersFromSession(): void {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Use nullish coalescing to avoid overriding with undefined.
      if (parsed.sortBy !== undefined) this.sortBy.set(parsed.sortBy);
      if (parsed.sortDir !== undefined) this.sortDir.set(parsed.sortDir);
      if (parsed.statusFilter !== undefined)
        this.statusFilter.set(parsed.statusFilter);
      if (parsed.locationFilter !== undefined)
        this.locationFilter.set(parsed.locationFilter);
      if (parsed.search !== undefined) this.search.set(parsed.search);
      if (parsed.dateStart !== undefined) this.dateStart.set(parsed.dateStart);
      if (parsed.dateEnd !== undefined) this.dateEnd.set(parsed.dateEnd);
    } catch {
      // If sessionStorage is unavailable (e.g. in private mode), silently
      // ignore persistence to avoid breaking the application.
    }
  }

  // Load als Observable (Resolver kann darauf warten). */
  loadEvents$(): Observable<{ data: Event[]; total: number }> {
    this.loading.set(true);
    return this.service
      .getEvents({
        page: this.page(),
        size: this.size(),
        sortBy: this.sortBy(),
        sortDir: this.sortDir(),
        status: this.statusFilter(),
        location: this.locationFilter(),
        search: this.search(),
        dateStart: this.dateStart(),
        dateEnd: this.dateEnd(),
      })
      .pipe(
        tap((res) => {
          this.events.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        }),
        finalize(() => {
          this.loading.set(false);
        }),
      );
  }

  loadEvents(): void {
    this.loadEvents$().subscribe();
  }

  /**
   * Components should call these methods instead of
   *directly accessing the underlying services.
   */

  // Create a new event.
  createEvent(event: Omit<Event, 'id'>): Observable<Event> {
    return this.service.addEvent(event).pipe(tap(() => this.loadEvents()));
  }

  //Modify an existing event.
  editEvent(eventId: number, changes: Partial<Event>): Observable<Event> {
    const current = this.events();
    const idx = current.findIndex((e) => e.id === eventId);
    if (idx !== -1) {
      const updated = { ...current[idx], ...changes } as Event;
      const newList = [...current];
      newList[idx] = updated;
      this.events.set(newList);
    }
    return this.service
      .updateEvent(eventId, changes)
      .pipe(tap(() => this.loadEvents()));
  }

  //Remove an event by its identifier.
  removeEvent(eventId: number): Observable<void> {
    return this.service.deleteEvent(eventId).pipe(tap(() => this.loadEvents()));
  }

  // Expose setter functions for external components to update state.
  updatePage(pageIndex: number): void {
    this.page.set(pageIndex);
  }
  updateSize(pageSize: number): void {
    this.size.set(pageSize);
  }
  updateSort(sort: {
    active: 'date' | 'location' | null;
    direction: 'asc' | 'desc' | null;
  }): void {
    this.sortBy.set(sort.active);
    this.sortDir.set(sort.direction);
    this.page.set(0);
    // Persist updated sort settings
    this.saveFiltersToSession();
  }
  updateStatusFilter(status: EventStatus | null): void {
    this.statusFilter.set(status);
    this.page.set(0);
    // Persist updated status filter
    this.saveFiltersToSession();
  }
  updateLocationFilter(location: string | null): void {
    this.locationFilter.set(location);
    this.page.set(0);
    // Persist updated location filter
    this.saveFiltersToSession();
  }
  updateSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
    // Persist updated search term
    this.saveFiltersToSession();
  }

  /** Update the date range for filtering. Accepts ISO strings or null. */
  updateDateRange(start: string | null, end: string | null): void {
    this.dateStart.set(start);
    this.dateEnd.set(end);
    this.page.set(0);
    // Persist updated date range
    this.saveFiltersToSession();
  }
}
