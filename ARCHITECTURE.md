# Calendar Copilot Architecture

```text
User
  |
  v
React / Next.js UI
  |
  |-- sample mode
  |     -> seeded calendar events
  |
  |-- live mode
        -> NextAuth Google OAuth
        -> Google Calendar API
        -> normalized CalendarEvent[]

CalendarEvent[]
  |
  |-- analytics.ts
  |     -> meeting load
  |     -> busiest days
  |     -> recurring meetings
  |     -> collaborators
  |     -> back-to-back meetings
  |
  |-- availability.ts
        -> working-hour free blocks
        -> ranked scheduling slots

Chat request
  |
  v
/api/chat
  |
  |-- compact calendar summary
  |-- deterministic analytics
  |-- OpenAI, when configured
  |-- deterministic fallback, when OpenAI is unavailable
  |
  v
Read-only recommendation / scheduling draft
```

## Key Design Choice

The LLM does not own the facts. Calendar availability and meeting analytics are deterministic functions. The model only turns those facts into a useful explanation, recommendation, or email draft.

## Data Model

```ts
type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  durationMinutes: number;
  attendees: string[];
  organizer?: string;
  location?: string;
  isAllDay: boolean;
  isRecurring: boolean;
};
```

## Safety Boundary

The app uses `calendar.readonly`. It never creates calendar events and never sends email. Scheduling output is intentionally copyable text.
