export type CalendarSource = "sample" | "live";

export type CalendarEvent = {
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

export type AvailabilityBlock = {
  start: string;
  end: string;
  durationMinutes: number;
  label: "morning" | "midday" | "afternoon";
  score: number;
};

export type DayLoad = {
  date: string;
  label: string;
  meetingMinutes: number;
  meetingCount: number;
};

export type ScheduleInsight = {
  title: string;
  description: string;
  severity: "good" | "watch" | "risk";
};

export type CalendarAnalytics = {
  rangeLabel: string;
  totalMeetingMinutes: number;
  totalMeetingHours: number;
  meetingCount: number;
  averageMeetingMinutes: number;
  busiestDay?: DayLoad;
  dayLoads: DayLoad[];
  recurringMeetings: CalendarEvent[];
  backToBackPairs: Array<{
    first: CalendarEvent;
    second: CalendarEvent;
  }>;
  topCollaborators: Array<{
    email: string;
    count: number;
  }>;
  largestFreeBlock?: AvailabilityBlock;
  freeBlocks: AvailabilityBlock[];
  insights: ScheduleInsight[];
};
