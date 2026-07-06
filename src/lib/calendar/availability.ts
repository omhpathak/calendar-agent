import {
  addDays,
  differenceInMinutes,
  endOfDay,
  format,
  getDay,
  isBefore,
  isSameDay,
  max,
  min,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import type { AvailabilityBlock, CalendarEvent } from "./types";

const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 17;
const MIN_BLOCK_MINUTES = 30;

function workingDayBounds(day: Date) {
  const start = setMinutes(setHours(startOfDay(day), WORKDAY_START_HOUR), 0);
  const end = setMinutes(setHours(startOfDay(day), WORKDAY_END_HOUR), 0);
  return { start, end };
}

function labelFor(start: Date): AvailabilityBlock["label"] {
  const hour = start.getHours();
  if (hour < 12) return "morning";
  if (hour < 14) return "midday";
  return "afternoon";
}

function scoreBlock(start: Date, durationMinutes: number) {
  const label = labelFor(start);
  const durationScore = Math.min(durationMinutes / 120, 1) * 55;
  const timeScore = label === "afternoon" ? 30 : label === "midday" ? 18 : 8;
  const wholeHourBonus = start.getMinutes() === 0 ? 10 : 0;
  return Math.round(durationScore + timeScore + wholeHourBonus);
}

export function getFreeBlocks(
  events: CalendarEvent[],
  now = new Date(),
  daysToScan = 10,
): AvailabilityBlock[] {
  const blocks: AvailabilityBlock[] = [];

  for (let offset = 0; offset < daysToScan; offset += 1) {
    const day = addDays(now, offset);
    const weekday = getDay(day);
    if (weekday === 0 || weekday === 6) continue;

    const { start: workStart, end: workEnd } = workingDayBounds(day);
    const earliestStart = isSameDay(day, now) ? max([workStart, now]) : workStart;

    if (!isBefore(earliestStart, workEnd)) continue;

    const dayEvents = events
      .filter((event) => !event.isAllDay)
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return isBefore(eventStart, endOfDay(day)) && isBefore(startOfDay(day), eventEnd);
      })
      .map((event) => ({
        start: max([new Date(event.start), workStart]),
        end: min([new Date(event.end), workEnd]),
      }))
      .filter((event) => isBefore(event.start, event.end))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = earliestStart;
    for (const event of dayEvents) {
      if (isBefore(cursor, event.start)) {
        const durationMinutes = differenceInMinutes(event.start, cursor);
        if (durationMinutes >= MIN_BLOCK_MINUTES) {
          blocks.push({
            start: cursor.toISOString(),
            end: event.start.toISOString(),
            durationMinutes,
            label: labelFor(cursor),
            score: scoreBlock(cursor, durationMinutes),
          });
        }
      }

      if (isBefore(cursor, event.end)) {
        cursor = event.end;
      }
    }

    if (isBefore(cursor, workEnd)) {
      const durationMinutes = differenceInMinutes(workEnd, cursor);
      if (durationMinutes >= MIN_BLOCK_MINUTES) {
        blocks.push({
          start: cursor.toISOString(),
          end: workEnd.toISOString(),
          durationMinutes,
          label: labelFor(cursor),
          score: scoreBlock(cursor, durationMinutes),
        });
      }
    }
  }

  return blocks.sort((a, b) => b.score - a.score);
}

export function formatBlock(block: AvailabilityBlock) {
  return `${format(new Date(block.start), "EEE, MMM d h:mm a")} - ${format(
    new Date(block.end),
    "h:mm a",
  )}`;
}
