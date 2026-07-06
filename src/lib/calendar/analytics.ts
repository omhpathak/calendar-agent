import {
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { getFreeBlocks } from "./availability";
import type {
  CalendarAnalytics,
  CalendarEvent,
  DayLoad,
  ScheduleInsight,
} from "./types";

function eventDuration(event: CalendarEvent) {
  if (event.durationMinutes > 0) return event.durationMinutes;
  return Math.max(0, differenceInMinutes(new Date(event.end), new Date(event.start)));
}

function buildDayLoads(events: CalendarEvent[]): DayLoad[] {
  const byDay = new Map<string, DayLoad>();

  for (const event of events) {
    if (event.isAllDay) continue;
    const start = new Date(event.start);
    const key = format(start, "yyyy-MM-dd");
    const existing = byDay.get(key) ?? {
      date: key,
      label: format(start, "EEE, MMM d"),
      meetingMinutes: 0,
      meetingCount: 0,
    };

    existing.meetingMinutes += eventDuration(event);
    existing.meetingCount += 1;
    byDay.set(key, existing);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function getBackToBackPairs(events: CalendarEvent[]) {
  const sorted = events
    .filter((event) => !event.isAllDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const pairs: CalendarAnalytics["backToBackPairs"] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const first = sorted[index];
    const second = sorted[index + 1];
    const firstEnd = new Date(first.end);
    const secondStart = new Date(second.start);
    const gap = differenceInMinutes(secondStart, firstEnd);

    if (isSameDay(firstEnd, secondStart) && gap >= 0 && gap <= 10) {
      pairs.push({ first, second });
    }
  }

  return pairs;
}

function getTopCollaborators(events: CalendarEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    for (const attendee of event.attendees) {
      const email = attendee.toLowerCase();
      counts.set(email, (counts.get(email) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildInsights(
  dayLoads: DayLoad[],
  backToBackPairs: CalendarAnalytics["backToBackPairs"],
  freeBlockCount: number,
): ScheduleInsight[] {
  const insights: ScheduleInsight[] = [];
  const heavyDays = dayLoads.filter((day) => day.meetingMinutes >= 240);

  if (heavyDays.length > 0) {
    insights.push({
      title: "Meeting load is concentrated",
      description: `${heavyDays.length} day${heavyDays.length > 1 ? "s" : ""} have 4+ hours of meetings. Move low-priority check-ins off those days first.`,
      severity: "risk",
    });
  } else {
    insights.push({
      title: "Meeting load is reasonably balanced",
      description: "No scanned day crosses four hours of meetings, so the calendar has room for focus blocks.",
      severity: "good",
    });
  }

  if (backToBackPairs.length > 0) {
    insights.push({
      title: "Back-to-back meetings need buffers",
      description: `${backToBackPairs.length} tight handoff${backToBackPairs.length > 1 ? "s" : ""} leave ten minutes or less between meetings.`,
      severity: "watch",
    });
  }

  if (freeBlockCount < 4) {
    insights.push({
      title: "Focus time is scarce",
      description: "There are fewer than four useful free blocks in the next scan window.",
      severity: "risk",
    });
  } else {
    insights.push({
      title: "Protected focus time is available",
      description: "There are enough open blocks to reserve deep work or workouts before adding new meetings.",
      severity: "good",
    });
  }

  return insights;
}

export function analyzeCalendar(
  events: CalendarEvent[],
  now = new Date(),
): CalendarAnalytics {
  const upcoming = events
    .filter((event) => isAfter(new Date(event.end), startOfDay(now)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const timedEvents = upcoming.filter((event) => !event.isAllDay);
  const dayLoads = buildDayLoads(timedEvents);
  const totalMeetingMinutes = timedEvents.reduce(
    (sum, event) => sum + eventDuration(event),
    0,
  );
  const meetingCount = timedEvents.length;
  const freeBlocks = getFreeBlocks(timedEvents, now, 10);
  const backToBackPairs = getBackToBackPairs(timedEvents);
  const busiestDay = dayLoads.reduce<DayLoad | undefined>((busiest, day) => {
    if (!busiest || day.meetingMinutes > busiest.meetingMinutes) return day;
    return busiest;
  }, undefined);

  return {
    rangeLabel: upcoming.length
      ? `${format(new Date(upcoming[0].start), "MMM d")} - ${format(
          new Date(upcoming[upcoming.length - 1].end),
          "MMM d",
        )}`
      : "No upcoming events",
    totalMeetingMinutes,
    totalMeetingHours: Math.round((totalMeetingMinutes / 60) * 10) / 10,
    meetingCount,
    averageMeetingMinutes: meetingCount
      ? Math.round(totalMeetingMinutes / meetingCount)
      : 0,
    busiestDay,
    dayLoads,
    recurringMeetings: timedEvents.filter((event) => event.isRecurring).slice(0, 8),
    backToBackPairs,
    topCollaborators: getTopCollaborators(timedEvents),
    largestFreeBlock: freeBlocks[0],
    freeBlocks,
    insights: buildInsights(dayLoads, backToBackPairs, freeBlocks.length),
  };
}

export function getUpcomingEvents(events: CalendarEvent[], limit = 12) {
  const now = new Date();
  return events
    .filter((event) => isBefore(now, new Date(event.end)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, limit);
}

export function summarizeForAgent(events: CalendarEvent[], analytics: CalendarAnalytics) {
  return {
    generatedAt: new Date().toISOString(),
    analytics,
    events: events.slice(0, 40).map((event) => ({
      title: event.title,
      start: event.start,
      end: event.end,
      durationMinutes: event.durationMinutes,
      attendees: event.attendees,
      isRecurring: event.isRecurring,
    })),
  };
}
