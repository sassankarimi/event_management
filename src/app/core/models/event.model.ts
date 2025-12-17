export type EventStatus = 'geplant' | 'abgesagt' | 'erledigt';

export type ParticipantRole = 'Teilnehmer' | 'Referent' | 'Gast';

export interface Participant {
  id: number;
  name: string;
  email: string;
  role: ParticipantRole;
}
export interface Event {
  id: number;
  date: string;
  location: string;
  status: EventStatus;
  participants: Participant[];
}
