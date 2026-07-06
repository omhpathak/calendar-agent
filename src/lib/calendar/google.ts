import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CalendarEvent } from "./types";

function normalizeGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent | null {
  const startValue = event.start?.dateTime ?? event.start?.date;
  const endValue = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !startValue || !endValue) return null;

  const isAllDay = Boolean(event.start?.date);
  const start = new Date(startValue);
  const end = new Date(endValue);
  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );

  return {
    id: event.id,
    title: event.summary ?? "Untitled event",
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    attendees:
      event.attendees
        ?.map((attendee) => attendee.email)
        .filter((email): email is string => Boolean(email)) ?? [],
    organizer: event.organizer?.email,
    location: event.location ?? undefined,
    isAllDay,
    isRecurring: Boolean(event.recurringEventId || event.recurrence?.length),
  };
}

export async function fetchGoogleCalendarEvents(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: 200,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (
    response.data.items
      ?.map(normalizeGoogleEvent)
      .filter((event): event is CalendarEvent => Boolean(event)) ?? []
  );
}
