import { addDays, getDay, setHours, setMinutes } from "date-fns";
import type { CalendarEvent } from "./types";

function atDay(base: Date, offset: number, hour: number, minute = 0) {
  return setMinutes(setHours(addDays(base, offset), hour), minute);
}

function event(
  base: Date,
  id: string,
  title: string,
  dayOffset: number,
  startHour: number,
  startMinute: number,
  durationMinutes: number,
  attendees: string[],
  options: Partial<Pick<CalendarEvent, "organizer" | "location" | "isRecurring">> = {},
): CalendarEvent {
  const start = atDay(base, dayOffset, startHour, startMinute);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    id,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    attendees,
    organizer: options.organizer ?? attendees[0],
    location: options.location,
    isAllDay: false,
    isRecurring: options.isRecurring ?? false,
  };
}

export function getSampleEvents(now = new Date()): CalendarEvent[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekday = getDay(today);
  const base =
    weekday === 0 ? addDays(today, 1) : weekday === 6 ? addDays(today, 2) : today;

  return [
    event(base, "sample-1", "Product strategy sync", 0, 10, 0, 45, [
      "maya@acme.com",
      "alex@acme.com",
    ], { isRecurring: true }),
    event(base, "sample-2", "Recruiting pipeline review", 0, 11, 0, 30, [
      "recruiting@acme.com",
    ]),
    event(base, "sample-3", "Customer escalation: Northstar", 0, 13, 30, 60, [
      "sam@northstar.io",
      "maya@acme.com",
    ]),
    event(base, "sample-4", "Design critique", 0, 15, 0, 45, [
      "design@acme.com",
      "alex@acme.com",
    ], { isRecurring: true }),
    event(base, "sample-5", "Engineering standup", 1, 9, 30, 30, [
      "eng@acme.com",
      "dan@acme.com",
    ], { isRecurring: true }),
    event(base, "sample-6", "Joe scheduling hold", 1, 12, 0, 30, [
      "joe@example.com",
    ]),
    event(base, "sample-7", "Roadmap tradeoffs", 1, 14, 0, 60, [
      "sally@example.com",
      "maya@acme.com",
    ]),
    event(base, "sample-8", "Dan 1:1", 2, 10, 30, 30, ["dan@example.com"], {
      isRecurring: true,
    }),
    event(base, "sample-9", "Metrics deep dive", 2, 13, 0, 90, [
      "finance@acme.com",
      "alex@acme.com",
    ]),
    event(base, "sample-10", "Architecture review", 3, 11, 0, 60, [
      "platform@acme.com",
      "dan@acme.com",
    ]),
    event(base, "sample-11", "Board prep", 3, 15, 30, 60, [
      "maya@acme.com",
      "ops@acme.com",
    ]),
    event(base, "sample-12", "Weekly planning", 4, 9, 0, 45, [
      "team@acme.com",
    ], { isRecurring: true }),
    event(base, "sample-13", "Sally partnership intro", 4, 13, 0, 30, [
      "sally@example.com",
    ]),
    event(base, "sample-14", "Focus review retro", 7, 16, 0, 45, [
      "alex@acme.com",
      "maya@acme.com",
    ], { isRecurring: true }),
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
