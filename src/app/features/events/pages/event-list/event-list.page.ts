import {
  Component,
  inject,
  effect,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl } from '@angular/forms';
import { signal } from '@angular/core';

import {
  EventFormDialog,
  EventFormData,
} from '../../dialogs/event-form/event-form.dialog';
import { EventDetailComponent } from '../../components/event-detail/event-detail.component';

import { EventStore } from '../../../../core/stores/event.store';
import { EventStatus } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-list-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './event-list.page.html',
  styleUrls: ['./event-list.page.scss'],
  // OnPush is used to improve performance because data is provided via
  // signals and RxJS, and updates occur only on new emissions.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventListPage {
  store = inject(EventStore);
  displayedColumns = ['date', 'location', 'status', 'participants', 'info'];

  /**
   * Derived list of unique locations (sorted). Purely derived from events,
   * so computed is the best fit here.
   */
  readonly locations = computed(() => {
    const set = new Set<string>(this.store.events().map((e) => e.location));
    return Array.from(set).sort();
  });

  locationControl: FormControl<string | null> = new FormControl<string | null>(
    null,
  );
  /**
   * Filtered locations for the autocomplete. Maintained as a signal so that
   * the template can reactively display suggestions when the user types or
   * when the list of all locations changes (e.g. after loading events).
   */
  filteredLocations = signal<string[]>([]);

  private dialog = inject(MatDialog);

  groupBy: '' | 'status' | 'location' = '';
  groups: { key: string; events: any[]; participantCount: number }[] = [];
  loading = this.store.loading;
  constructor() {
    effect(() => {
      // Track changes in the events signal
      this.store.events();
      this.recalculateGroups();
      // Whenever the list of locations changes, reset the filtered list
      this.filteredLocations.set(this.locations());
    });
    //Initialize the location input with the persisted filter (Location from session storage)
    const persistedLocation = this.store.locationFilter();
    if (persistedLocation) {
      this.locationControl.setValue(persistedLocation);
    }
    this.locationControl.valueChanges.subscribe((value) => {
      const search = (value ?? '').toLowerCase();
      const all = this.locations();
      const filtered = !search
        ? all
        : all.filter((loc) => loc.toLowerCase().includes(search));
      this.filteredLocations.set(filtered);
    });
  }

  get startDate(): Date | null {
    const iso = this.store.dateStart();
    return iso ? new Date(iso) : null;
  }

  get endDate(): Date | null {
    const iso = this.store.dateEnd();
    return iso ? new Date(iso) : null;
  }

  onSort(event: Sort): void {
    if (!event.direction) {
      //Default sort
      this.store.updateSort({ active: null, direction: null });
      return;
    }

    this.store.updateSort({
      active: event.active as 'date' | 'location',
      direction: event.direction as 'asc' | 'desc',
    });
  }

  onPage(event: PageEvent): void {
    this.store.updateSize(event.pageSize);
    this.store.updatePage(event.pageIndex);
  }

  openCreateDialog(): void {
    this.dialog
      .open(EventFormDialog, {
        data: null,
        width: '400px',
        maxWidth: '80vw',
      })
      .afterClosed()
      .subscribe((result: EventFormData | undefined) => {
        if (result) {
          this.store
            .createEvent({
              date: result.date!,
              location: result.location!,
              status: result.status! as any,
              participants: [],
            } as any)
            .subscribe();
        }
      });
  }

  openDetail(row: any): void {
    this.dialog.open(EventDetailComponent, {
      data: { eventId: row.id },
      width: '1100px',
      maxWidth: '80vw',
    });
  }

  updateStatus(event: any, newStatus: EventStatus): void {
    if (event.status === newStatus) return;
    this.store.editEvent(event.id, { status: newStatus }).subscribe();
  }

  updateLocation(event: any, newLocation: string): void {
    const trimmed = newLocation?.trim();
    if (!trimmed || trimmed === event.location) return;
    this.store.editEvent(event.id, { location: trimmed }).subscribe();
  }

  /**
   * Called when a location is selected from the autocomplete filter. This
   * updates the store filter and clears the filter control if the user
   * selects the 'Alle' option (represented by null).
   */
  onLocationSelected(value: string | null): void {
    // Update the store's location filter. Passing null resets the filter.
    this.store.updateLocationFilter(value);
  }

  updateGroupBy(value: '' | 'status' | 'location'): void {
    this.groupBy = value;
    this.recalculateGroups();
  }

  private recalculateGroups(): void {
    if (!this.groupBy) {
      this.groups = [];
      return;
    }

    const map = new Map<string, { events: any[]; participantCount: number }>();
    for (const event of this.store.events()) {
      const key = event[this.groupBy];
      if (!map.has(key)) {
        map.set(key, { events: [], participantCount: 0 });
      }
      const g = map.get(key)!;
      g.events.push(event);
      g.participantCount += event.participants.length;
    }

    this.groups = Array.from(map.entries()).map(([key, value]) => ({
      key,
      events: value.events,
      participantCount: value.participantCount,
    }));
  }

  onStartDateChange(date: Date | null): void {
    const iso = date ? date.toISOString() : null;
    this.store.updateDateRange(iso, this.store.dateEnd());
  }

  onEndDateChange(date: Date | null): void {
    const iso = date ? date.toISOString() : null;
    this.store.updateDateRange(this.store.dateStart(), iso);
  }
  ResetFilters(): void {
    this.groupBy = '';
    this.groups = [];
    this.recalculateGroups;
    this.store.updateLocationFilter(null);
    this.store.updateDateRange(null, null);
    this.locationControl.setValue(null);
    this.store.statusFilter.set(null);
    this.store.search.set('');
  }
  exportCsv(): void {
    const rows = this.store.events();
    const header = ['Datum', 'Ort', 'Status', 'Teilnehmer'];
    const csvRows = rows.map((e) => [
      new Date(e.date).toLocaleDateString('de-DE'),
      e.location,
      e.status,
      String(e.participants.length),
    ]);
    const allRows = [header, ...csvRows];
    const csvContent = allRows.map((r) => r.join(';')).join('\n');
    const csvWithBom = '\uFEFF' + csvContent;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veranstaltungen.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
