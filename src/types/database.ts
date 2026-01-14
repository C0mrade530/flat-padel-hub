export type EventType = 'training' | 'tournament' | 'stretching' | 'other';
export type EventStatus = 'scheduled' | 'canceled' | 'completed';
export type ParticipantStatus = 'confirmed' | 'waiting' | 'canceled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type UserRole = 'player' | 'assistant' | 'owner';
export type MembershipStatus = 'unpaid' | 'paid' | 'pause';

export interface DbEvent {
  id: string;
  event_type: EventType;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_seats: number;
  current_seats: number;
  price: number;
  level: string;
  description: string | null;
  status: EventStatus;
  created_at?: string;
}

export interface DbUser {
  id: string;
  telegram_id: number;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  level: string | null;
  role: UserRole;
  membership_status: MembershipStatus;
  created_at?: string;
}

export interface DbEventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  queue_position: number | null;
  registered_at: string;
}

export interface DbPayment {
  id: string;
  participant_id: string;
  user_id: string;
  event_id: string;
  amount: number;
  status: PaymentStatus;
  created_at?: string;
}

// Join types
export interface EventWithParticipants extends DbEvent {
  participants?: (DbEventParticipant & { user: DbUser })[];
}

export interface BookingWithEvent extends DbEventParticipant {
  event: DbEvent;
}

export interface Database {
  public: {
    Tables: {
      events: {
        Row: DbEvent;
        Insert: Omit<DbEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<DbEvent, 'id'>>;
      };
      users: {
        Row: DbUser;
        Insert: Omit<DbUser, 'id' | 'created_at'>;
        Update: Partial<Omit<DbUser, 'id'>>;
      };
      event_participants: {
        Row: DbEventParticipant;
        Insert: Omit<DbEventParticipant, 'id'>;
        Update: Partial<Omit<DbEventParticipant, 'id'>>;
      };
      payments: {
        Row: DbPayment;
        Insert: Omit<DbPayment, 'id' | 'created_at'>;
        Update: Partial<Omit<DbPayment, 'id'>>;
      };
    };
  };
}
