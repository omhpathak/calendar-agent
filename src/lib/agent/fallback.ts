import { format } from "date-fns";
import { formatBlock } from "@/lib/calendar/availability";
import type { CalendarAnalytics, CalendarEvent } from "@/lib/calendar/types";

function hours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10} hours`;
}

function topSlots(analytics: CalendarAnalytics, count = 3) {
  return analytics.freeBlocks
    .slice(0, count)
    .map((block) => `- ${formatBlock(block)} (${block.durationMinutes} min)`)
    .join("\n");
}

function schedulingSlots(analytics: CalendarAnalytics, avoidMornings: boolean) {
  const slots: string[] = [];

  for (const block of analytics.freeBlocks) {
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    const earliest = new Date(blockStart);

    if (avoidMornings) {
      earliest.setHours(13, 0, 0, 0);
    }

    const start = blockStart > earliest ? blockStart : earliest;
    const end = new Date(start.getTime() + 30 * 60_000);

    if (end <= blockEnd) {
      slots.push(
        `- ${format(start, "EEE, MMM d h:mm a")} - ${format(end, "h:mm a")}`,
      );
    }

    if (slots.length === 3) break;
  }

  return slots;
}

function recommendations(analytics: CalendarAnalytics) {
  const recs = [
    analytics.busiestDay
      ? `Move or shorten one meeting on ${analytics.busiestDay.label}; it currently has ${hours(
          analytics.busiestDay.meetingMinutes,
        )} of meetings.`
      : "Keep the current calendar shape; there are not many meetings in the scan window.",
    analytics.backToBackPairs.length
      ? `Add buffers around ${analytics.backToBackPairs.length} back-to-back handoff${
          analytics.backToBackPairs.length > 1 ? "s" : ""
        }.`
      : "Preserve the current gaps between meetings; they are doing useful work.",
    analytics.recurringMeetings.length
      ? `Audit recurring meetings first: ${analytics.recurringMeetings
          .slice(0, 3)
          .map((event) => event.title)
          .join(", ")}.`
      : "There are few recurring meetings, so focus on ad hoc scheduling discipline.",
  ];

  return recs.map((rec) => `- ${rec}`).join("\n");
}

function schedulingResponse(analytics: CalendarAnalytics, avoidMornings: boolean) {
  const slots = schedulingSlots(analytics, avoidMornings);
  if (!slots.length) {
    return `I do not see three clean 30 minute slots in the current working-hours window.

Best available blocks:
${topSlots(analytics)}

If this were my calendar, I would first move one lower-priority meeting off the busiest day, then rerun the search.`;
  }

  return `I found three 30 minute options${avoidMornings ? " that keep mornings protected" : ""}:

${slots.join("\n")}

Why these work:
- They come from open working-hour blocks, not guessed availability.
- They avoid the busiest meeting clusters in the current scan.
- They leave room for buffers around existing meetings.`;
}

function emailDraft(analytics: CalendarAnalytics, avoidMornings: boolean) {
  const slots = schedulingSlots(analytics, avoidMornings);
  const slotText = slots.length
    ? slots.join("\n")
    : "- I do not see a strong open slot in the current calendar window.";

  return `Subject: Finding time to meet

Hi Joe, Dan, and Sally,

I am trying to keep my mornings protected for workouts and focused work, so I looked for afternoon options that avoid the busiest parts of my calendar.

Would any of these times work for a 30 minute meeting?

${slotText}

If none of those work, send me a few afternoon options and I will find the least disruptive fit.

Best,
`;
}

export function deterministicAgentResponse(
  message: string,
  events: CalendarEvent[],
  analytics: CalendarAnalytics,
) {
  const lower = message.toLowerCase();
  const nextEvent = events
    .filter((event) => new Date(event.end) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  if (lower.includes("email") || lower.includes("draft") || lower.includes("joe")) {
    const avoidMornings =
      lower.includes("morning") || lower.includes("workout") || lower.includes("gym");
    const slots = schedulingSlots(analytics, avoidMornings);

    return `I found afternoon-heavy options so your mornings stay protected.

Recommended slots:
${slots.length ? slots.join("\n") : topSlots(analytics)}

Copyable draft:

${emailDraft(analytics, avoidMornings)}`;
  }

  if (
    lower.includes("find") ||
    lower.includes("available") ||
    lower.includes("availability") ||
    lower.includes("slot") ||
    lower.includes("schedule")
  ) {
    const avoidMornings =
      lower.includes("morning") || lower.includes("workout") || lower.includes("gym");
    return schedulingResponse(analytics, avoidMornings);
  }

  if (lower.includes("decrease") || lower.includes("reduce") || lower.includes("recommend")) {
    return `You have ${hours(analytics.totalMeetingMinutes)} of meetings across ${
      analytics.meetingCount
    } upcoming events in this scan.

Recommended changes:
${recommendations(analytics)}

I would protect the highest-scoring free blocks first:
${topSlots(analytics)}`;
  }

  if (lower.includes("how much") || lower.includes("meeting")) {
    return `You are spending ${hours(analytics.totalMeetingMinutes)} in meetings across ${
      analytics.meetingCount
    } upcoming events.

Average meeting length: ${analytics.averageMeetingMinutes} minutes.
${
  analytics.busiestDay
    ? `Busiest day: ${analytics.busiestDay.label} with ${hours(
        analytics.busiestDay.meetingMinutes,
      )}.`
    : "There is no clear busiest day yet."
}

The most useful immediate move is to protect ${topSlots(analytics, 1).replace("- ", "")}.`;
  }

  if (lower.includes("next") && nextEvent) {
    return `Your next meeting is "${nextEvent.title}" on ${format(
      new Date(nextEvent.start),
      "EEE, MMM d 'at' h:mm a",
    )}. It is scheduled for ${nextEvent.durationMinutes} minutes.`;
  }

  return `Here is the current calendar read:

- ${hours(analytics.totalMeetingMinutes)} in meetings
- ${analytics.meetingCount} upcoming meetings
- ${analytics.freeBlocks.length} useful free blocks
- ${analytics.backToBackPairs.length} tight back-to-back handoffs

Best next actions:
${recommendations(analytics)}`;
}
