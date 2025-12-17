import {
  Component,
  Input,
  OnInit,
  inject,
  effect,
  ChangeDetectionStrategy,
  Inject,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../../core/services/event.service';
import { EventStore } from '../../../../core/stores/event.store';
import {
  Participant,
  ParticipantRole,
} from '../../../../core/models/event.model';
import { signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Component that displays the participants for a given event. It loads
 * the participants lazily from the backend when the component is
 * instantiated. Users can add new participants or remove existing
 * ones.
 */
@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatTooltipModule,
  ],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  // OnPush change detection is used because participants are managed via signals.
  // The view updates automatically when the signal emits a new reference.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent implements OnInit {
  @Input() eventId!: number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { eventId: number } | null,
    private dialogRef: MatDialogRef<EventDetailComponent> | null,
  ) {}
  private service = inject(EventService);
  private fb = inject(FormBuilder);
  private store = inject(EventStore);
  participants = signal<Participant[]>([]);
  displayedColumns = ['name', 'email', 'role', 'actions'];
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Teilnehmer', Validators.required],
  });

  ngOnInit(): void {
    // Determine the event ID from either the @Input() or the injected data
    const id = this.eventId ?? this.data?.eventId;
    if (!id) {
      return;
    }
    this.service.getParticipants(id).subscribe((list) => {
      this.participants.set(list);
    });
  }

  // Add a new participant to the list and send it to the backend.
  addParticipant(): void {
    if (this.form.invalid) {
      return;
    }
    const { name, email, role } = this.form.value;
    const newParticipant: Participant = {
      id: Date.now(),
      name: name!,
      email: email!,
      role: role! as ParticipantRole,
    };
    const current = [...this.participants()];
    current.push(newParticipant);
    this.participants.set(current);
    this.form.reset({ name: '', email: '', role: 'Teilnehmer' });
    const id = this.eventId ?? this.data?.eventId;
    if (!id) {
      return;
    }
    this.store.editEvent(id, { participants: current } as any).subscribe();
  }

  // Remove a participant by ID.
  removeParticipant(p: Participant): void {
    const current = this.participants().filter((x) => x.id !== p.id);
    this.participants.set(current);
    const id = this.eventId ?? this.data?.eventId;
    if (!id) {
      return;
    }
    this.store.editEvent(id, { participants: current } as any).subscribe();
  }
  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
