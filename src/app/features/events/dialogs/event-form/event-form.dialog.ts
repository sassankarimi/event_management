import {
  Component,
  Inject,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { EventStore } from '../../../../core/stores/event.store';
import { computed, signal } from '@angular/core';
import { EventStatus } from '../../../../core/models/event.model';

export interface EventFormData {
  date?: string;
  location?: string;
  status?: 'geplant' | 'abgesagt' | 'erledigt';
}
export function futureDateValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }
  // Convert the control value to a Date. Manual typing is disabled
  // (inputs are readonly), we expect either a Date instance or an ISO string.
  const selected = value instanceof Date ? value : new Date(value);
  selected.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Only dates strictly in the future (after today) are accepted
  return selected.getTime() > today.getTime() ? null : { futureDate: true };
}

/**
 * Dialog component for creating or editing an event. The form is
 * reactive and validates required fields and a future date. On
 * submission the dialog returns an object with the entered values.
 */
@Component({
  selector: 'app-event-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
  ],
  templateUrl: './event-form.dialog.html',
  styleUrls: ['./event-form.dialog.scss'],
  // OnPush change detection is used because this dialog relies on explicit
  // form control updates and does not require checks on every change
  // detection cycle.
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Set the locale for the datepicker to German so that manual date entry
  // recognises the dd.MM.yyyy format and the calendar displays German labels.
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'de-DE' }],
})
export class EventFormDialog {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly dialogRef: MatDialogRef<EventFormDialog> =
    inject(MatDialogRef);

  readonly form = this.fb.group({
    date: new FormControl<Date | null>(null, {
      validators: [Validators.required, futureDateValidator],
    }),
    location: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<EventStatus | null>(null, {
      validators: [Validators.required],
    }),
  });
  // Inject the EventStore to derive available locations for the autocomplete.
  private readonly store: EventStore = inject(EventStore);
  /**
   * A computed list of unique locations derived from the store's events. This
   * ensures that the autocomplete suggestions stay up‑to‑date when events
   * change. Sorted alphabetically for a better UX.
   */
  readonly locations = computed(() => {
    const set = new Set<string>(this.store.events().map((e) => e.location));
    return Array.from(set).sort();
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: EventFormData | null) {
    if (data) {
      this.form.patchValue({
        date: data.date ? new Date(data.date) : null,
        location: data.location ?? '',
        status: data.status ?? null,
      });
    } else {
      // For new events default the status to 'geplant' and keep it hidden in the UI.
      this.form.patchValue({ status: 'geplant' });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const { date, location, status } = this.form.getRawValue();
    // Guard against undefined (should not occur due to validators)
    if (!date || !status) {
      return;
    }
    // Convert the date value into an ISO string. Manual typing is disabled
    // so we expect either a Date instance or an ISO string. New Date is used
    // as a fallback to handle both cases uniformly.
    const dateObj: Date = date instanceof Date ? date : new Date(date as any);
    const eventData: EventFormData = {
      date: dateObj.toISOString(),
      location,
      status,
    };
    this.dialogRef.close(eventData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
