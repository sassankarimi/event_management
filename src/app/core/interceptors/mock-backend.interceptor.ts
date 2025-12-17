import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Event,
  EventStatus,
  Participant,
  ParticipantRole,
} from '../models/event.model';

/**
 * An HTTP interceptor that simulates a RESTful backend. A random latency between 100 and
 * 300 ms is applied to each response to mimic network delay.
 */
@Injectable()
export class MockBackendInterceptor implements HttpInterceptor {
  // Internal store of events.
  private events: Event[] | null = null;
  private nextEventId = 1;

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const { url, method } = req;
    if (!url.startsWith('/api/events')) {
      return next.handle(req);
    }

    // Lazy initialize dataset
    if (!this.events || this.events.length === 0) {
      this.events = this.generateEvents(100);
      this.nextEventId = this.events.length + 1;
    }

    // Determine operation based on method and URL
    const parts = url.split('/').filter((p) => p);
    // `/api/events` => parts = ['api', 'events']
    // `/api/events/123/participants` => parts = ['api','events','123','participants']
    // `/api/events/123` => parts = ['api','events','123']

    // Handle listing and creation
    if (method === 'GET' && parts.length === 2) {
      return this.handleList(req);
    }
    if (method === 'POST' && parts.length === 2) {
      return this.handleCreate(req);
    }

    // Extract event ID if present
    const id = parts.length > 2 ? Number(parts[2]) : null;
    if (!id || isNaN(id) || !this.events!.some((e) => e.id === id)) {
      return this.wrapResponse(404, { message: 'Event not found' });
    }

    // Participants endpoint
    if (parts.length === 4 && parts[3] === 'participants') {
      if (method === 'GET') {
        return this.wrapResponse(
          200,
          this.events!.find((e) => e.id === id)!.participants,
        );
      }
      return this.wrapResponse(405, { message: 'Method not allowed' });
    }

    // Single event endpoints
    if (method === 'PUT' && parts.length === 3) {
      return this.handleUpdate(id, req.body);
    }
    if (method === 'DELETE' && parts.length === 3) {
      return this.handleDelete(id);
    }

    return this.wrapResponse(405, { message: 'Method not allowed' });
  }

  /**
   * Generate a large number of events with random data. Each event has
   * between 3 and 10 participants. Dates are spread across the past
   * and future year. Locations and names are drawn from sample lists.
   */
  private generateEvents(count: number): Event[] {
    const statuses: EventStatus[] = ['geplant', 'abgesagt', 'erledigt'];
    const locations = [
      'Berlin',
      'Hamburg',
      'München',
      'Köln',
      'Frankfurt',
      'Münster',
      'Hannover',
      'Heidelberg',
    ];
    const firstNames = [
      'Anna',
      'Ben',
      'Clara',
      'Daniel',
      'Eva',
      'Felix',
      'Gabi',
    ];
    const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber'];
    const roles: ParticipantRole[] = ['Teilnehmer', 'Referent', 'Gast'];
    const events: Event[] = [];
    for (let i = 0; i < count; i++) {
      const date = this.randomDate();
      const location = this.randomChoice(locations);
      const status = this.randomChoice(statuses);
      const participants = this.generateParticipants(
        this.randomInt(3, 10),
        firstNames,
        lastNames,
        roles,
      );
      events.push({
        id: i + 1,
        date: date.toISOString(),
        location,
        status,
        participants,
      });
    }
    return events;
  }

  // Generate a list of participants.
  private generateParticipants(
    count: number,
    firstNames: string[],
    lastNames: string[],
    roles: ParticipantRole[],
  ): Participant[] {
    const participants: Participant[] = [];
    for (let i = 0; i < count; i++) {
      const name = `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
      const email = `${name.toLowerCase().replace(' ', '.')}@beispiel.de`;
      const role = this.randomChoice(roles);
      participants.push({ id: i + 1, name, email, role });
    }
    return participants;
  }

  // Pick a random item from an array.
  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Generate a date within ±365 days from today.
  private randomDate(): Date {
    const now = new Date();
    const offset = (Math.random() - 0.5) * 365 * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + offset);
  }

  // Random integer in [min, max].
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Handle GET /api/events with paging, sorting and filtering.
  private handleList(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    const page = parseInt(req.params.get('page') ?? '0', 10);
    const size = parseInt(req.params.get('size') ?? '25', 10);
    // Default sort by date ascending when no explicit sorting is provided.
    const sortBy = req.params.get('sortBy') ?? 'date';
    const sortDir = req.params.get('sortDir') ?? 'asc';

    // Normalise filters: Angular's HttpParams serialises null values to the string "null".
    // Interpret empty strings or the literal string "null" as no filter.
    const rawStatus = req.params.get('status');
    const statusFilter =
      rawStatus && rawStatus !== 'null' && rawStatus !== '' ? rawStatus : null;
    const rawLocation = req.params.get('location');
    const locationFilter =
      rawLocation && rawLocation !== 'null' && rawLocation !== ''
        ? rawLocation
        : null;
    const search = (req.params.get('search') ?? '').toLowerCase();
    const rawStart = req.params.get('dateStart');
    const dateStartParam =
      rawStart && rawStart !== 'null' && rawStart !== '' ? rawStart : null;
    const rawEnd = req.params.get('dateEnd');
    const dateEndParam =
      rawEnd && rawEnd !== 'null' && rawEnd !== '' ? rawEnd : null;

    // Start from a shallow copy so sorting/filtering does not mutate the original array.
    let data = [...(this.events ?? [])];

    // Apply filters only when values are present. Missing or "null" values are ignored.
    if (statusFilter) {
      data = data.filter((e) => e.status === statusFilter);
    }
    if (locationFilter) {
      data = data.filter((e) => e.location === locationFilter);
    }
    if (search) {
      data = data.filter((e) => {
        const dateString = new Date(e.date).toLocaleDateString('de-DE');
        return (
          e.location.toLowerCase().includes(search) ||
          e.status.toLowerCase().includes(search) ||
          dateString.includes(search)
        );
      });
    }

    // Filter by date range if provided. Convert ISO strings once outside of the loop.
    if (dateStartParam) {
      const startTs = new Date(dateStartParam).getTime();
      data = data.filter((e) => new Date(e.date).getTime() >= startTs);
    }
    if (dateEndParam) {
      const endTs = new Date(dateEndParam).getTime();
      data = data.filter((e) => new Date(e.date).getTime() <= endTs);
    }

    // Total count before paging
    const total = data.length;

    // Sorting: default to date when sortBy is unknown.
    data.sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'location') {
        return a.location.localeCompare(b.location) * factor;
      }
      // default sort by date
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * factor;
    });

    // Paging
    const startIndex = page * size;
    const paged = data.slice(startIndex, startIndex + size);
    return this.wrapResponse(200, { data: paged, total });
  }

  /** Handle POST /api/events to add a new event. */
  private handleCreate(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    const event = req.body as Omit<Event, 'id'>;
    const newEvent: Event = {
      ...event,
      id: this.nextEventId++,
      participants: event.participants ?? [],
    };
    this.events!.push(newEvent);
    return this.wrapResponse(201, newEvent);
  }

  /** Handle PUT /api/events/:id to update an event. */
  private handleUpdate(id: number, body: any): Observable<HttpEvent<any>> {
    const index = this.events!.findIndex((e) => e.id === id);
    const current = this.events![index];
    this.events![index] = { ...current, ...body };
    return this.wrapResponse(200, this.events![index]);
  }

  /** Handle DELETE /api/events/:id to remove an event. */
  private handleDelete(id: number): Observable<HttpEvent<any>> {
    this.events = this.events!.filter((e) => e.id !== id);
    return this.wrapResponse(204, null);
  }

  /** Wrap a body into an HttpResponse with simulated latency. */
  private wrapResponse<T>(status: number, body: T): Observable<HttpEvent<T>> {
    const latency = 100 + Math.floor(Math.random() * 200);
    return of(new HttpResponse({ status, body })).pipe(delay(latency));
  }
}
