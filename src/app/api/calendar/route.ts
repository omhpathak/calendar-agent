import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { analyzeCalendar } from "@/lib/calendar/analytics";
import { fetchGoogleCalendarEvents } from "@/lib/calendar/google";
import { getSampleEvents } from "@/lib/calendar/sample-data";
import type { CalendarSource } from "@/lib/calendar/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSource = searchParams.get("source") as CalendarSource | null;

  if (requestedSource !== "live") {
    const events = getSampleEvents();
    return NextResponse.json({
      source: "sample" satisfies CalendarSource,
      events,
      analytics: analyzeCalendar(events),
      error: null,
    });
  }

  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.authError) {
    const events = getSampleEvents();
    return NextResponse.json({
      source: "sample" satisfies CalendarSource,
      events,
      analytics: analyzeCalendar(events),
      error: session?.authError
        ? "Google Calendar auth needs to be refreshed. Sign in again to load live events. Showing sample data."
        : "Connect Google Calendar to load live events. Showing sample data.",
    });
  }

  try {
    const events = await fetchGoogleCalendarEvents(session.accessToken);
    return NextResponse.json({
      source: "live" satisfies CalendarSource,
      events,
      analytics: analyzeCalendar(events),
      error: null,
    });
  } catch (error) {
    const events = getSampleEvents();
    return NextResponse.json(
      {
        source: "sample" satisfies CalendarSource,
        events,
        analytics: analyzeCalendar(events),
        error:
          error instanceof Error
            ? `Calendar API failed: ${error.message}. Showing sample data.`
            : "Calendar API failed. Showing sample data.",
      },
      { status: 200 },
    );
  }
}
