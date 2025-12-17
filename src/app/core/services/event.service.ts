import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, Participant } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);

  getEvents(params: {
    page: number;
    size: number;
    sortBy: string | null;
    sortDir: string | null;
    status?: string | null;
    location?: string | null;
    search?: string;
    dateStart?: string | null;
    dateEnd?: string | null;
  }): Observable<{ data: Event[]; total: number }> {
    return this.http.get<{ data: Event[]; total: number }>('/api/events', {
      params: params as any,
    });
  }

  // Retrieve the participants for a specific event.
  getParticipants(eventId: number): Observable<Participant[]> {
    return this.http.get<Participant[]>(`/api/events/${eventId}/participants`);
  }

  // Create a new event on the backend.
  addEvent(event: Omit<Event, 'id'>): Observable<Event> {
    return this.http.post<Event>('/api/events', event);
  }

  // Update properties of an existing event.
  updateEvent(eventId: number, changes: Partial<Event>): Observable<Event> {
    return this.http.put<Event>(`/api/events/${eventId}`, changes);
  }

  // Remove an event.
  deleteEvent(eventId: number): Observable<void> {
    return this.http.delete<void>(`/api/events/${eventId}`);
  }
}
