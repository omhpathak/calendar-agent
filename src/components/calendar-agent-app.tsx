"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Lock,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type {
  CalendarAnalytics,
  CalendarEvent,
  CalendarSource,
} from "@/lib/calendar/types";

type CalendarPayload = {
  source: CalendarSource;
  events: CalendarEvent[];
  analytics: CalendarAnalytics;
  error: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "openai" | "fallback";
  openai?: "ok" | "disabled" | "missing_key" | "quota_or_rate_limit" | "invalid_key" | "request_failed";
  warning?: string;
};

const promptChips = [
  "How much of my time am I spending in meetings?",
  "How would you recommend I decrease that?",
  "Find three times for a 30 minute meeting this week.",
  "Draft an email to Joe, Dan, and Sally while keeping mornings free.",
];

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function eventTime(event: CalendarEvent) {
  return `${format(new Date(event.start), "EEE, MMM d h:mm a")} - ${format(
    new Date(event.end),
    "h:mm a",
  )}`;
}

function blockTime(start: string, end: string) {
  return `${format(new Date(start), "EEE h:mm a")} - ${format(new Date(end), "h:mm a")}`;
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">{icon}</div>
      </div>
      <p className="mt-3 text-sm leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

export function CalendarAgentApp() {
  const { data: session, status } = useSession();
  const [source, setSource] = useState<CalendarSource>("sample");
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can read the calendar context on this page, explain meeting load, find low-disruption availability, and draft scheduling emails. I am read-only, so I will not create events or send anything.",
      mode: "fallback",
    },
  ]);

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
      setLoadingCalendar(true);
      setCalendarError(null);
      try {
        const response = await fetch(`/api/calendar?source=${source}`, {
          cache: "no-store",
        });
        const nextPayload = (await response.json()) as CalendarPayload;
        if (!active) return;
        setPayload(nextPayload);
        setCalendarError(nextPayload.error);
      } catch (error) {
        if (!active) return;
        setCalendarError(
          error instanceof Error ? error.message : "Failed to load calendar data.",
        );
      } finally {
        if (active) setLoadingCalendar(false);
      }
    }

    loadCalendar();
    return () => {
      active = false;
    };
  }, [source, session?.user?.email, reloadKey]);

  const analytics = payload?.analytics;
  const events = useMemo(() => payload?.events ?? [], [payload?.events]);
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => new Date(event.end) > new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 10),
    [events],
  );

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || chatLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, events }),
      });
      const result = (await response.json()) as {
        content?: string;
        mode?: "openai" | "fallback";
        openai?: ChatMessage["openai"];
        warning?: string;
        error?: string;
      };
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.content ?? result.error ?? "I could not answer that.",
          mode: result.mode,
          openai: result.openai,
          warning: result.warning,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? `Chat failed: ${error.message}`
              : "Chat failed unexpectedly.",
          mode: "fallback",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                <CalendarDays size={20} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Calendar Copilot
              </h1>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {payload?.source === "live" ? "Live Google Calendar" : "Sample mode"}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              A read-only calendar agent that computes availability and schedule
              health in code, then uses an agent interface for recommendations and
              email drafting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              onClick={() => setSource("sample")}
            >
              <ShieldCheck size={16} />
              Sample
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={status === "loading"}
              onClick={() => {
                if (session) setSource("live");
                else signIn("google");
              }}
            >
              <Lock size={16} />
              {session ? "Use live calendar" : "Connect Google"}
            </button>
            {session ? (
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        {calendarError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {calendarError}
          </div>
        ) : null}

        {loadingCalendar || !analytics ? (
          <section className="flex min-h-[520px] items-center justify-center rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <Loader2 className="animate-spin" size={18} />
              Loading calendar intelligence
            </div>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={<Clock3 size={18} />}
                  label="Meeting load"
                  value={`${analytics.totalMeetingHours}h`}
                  detail={`${analytics.meetingCount} collaboration meetings from ${analytics.rangeLabel}`}
                />
                <MetricCard
                  icon={<Activity size={18} />}
                  label="Busy blocks"
                  value={`${analytics.busyBlockHours}h`}
                  detail={`${analytics.busyBlockCount} solo/long blocks excluded from meeting load`}
                />
                <MetricCard
                  icon={<CalendarDays size={18} />}
                  label="Busiest day"
                  value={analytics.busiestDay?.label.split(",")[0] ?? "None"}
                  detail={
                    analytics.busiestDay
                      ? `${minutesLabel(analytics.busiestDay.meetingMinutes)} across ${analytics.busiestDay.meetingCount} meetings`
                      : "No upcoming meetings found"
                  }
                />
                <MetricCard
                  icon={<Sparkles size={18} />}
                  label="Best free block"
                  value={
                    analytics.largestFreeBlock
                      ? minutesLabel(analytics.largestFreeBlock.durationMinutes)
                      : "None"
                  }
                  detail={
                    analytics.largestFreeBlock
                      ? blockTime(
                          analytics.largestFreeBlock.start,
                          analytics.largestFreeBlock.end,
                        )
                      : "No useful working-hour block found"
                  }
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">Upcoming meetings</h2>
                      <p className="text-sm text-slate-500">
                        Pulls from Google Calendar when connected
                      </p>
                    </div>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      onClick={() => setReloadKey((current) => current + 1)}
                    >
                      <RefreshCw size={15} />
                      Refresh
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {upcoming.map((event) => (
                      <div
                        key={event.id}
                        className="grid gap-3 py-3 sm:grid-cols-[150px_minmax(0,1fr)_90px]"
                      >
                        <div className="text-sm font-medium text-slate-600">
                          {eventTime(event)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {event.title}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {event.attendees.length
                              ? event.attendees.join(", ")
                              : event.organizer ?? "No attendees listed"}
                          </p>
                        </div>
                        <div className="flex items-start justify-end">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {minutesLabel(event.durationMinutes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-5">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Schedule health</h2>
                    <div className="mt-3 space-y-3">
                      {analytics.insights.map((insight) => (
                        <div
                          key={insight.title}
                          className="rounded-md border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              size={16}
                              className={
                                insight.severity === "risk"
                                  ? "text-rose-600"
                                  : insight.severity === "watch"
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                              }
                            />
                            <p className="text-sm font-semibold">{insight.title}</p>
                          </div>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {insight.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Best availability</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.freeBlocks.slice(0, 5).map((block) => (
                        <div
                          key={`${block.start}-${block.end}`}
                          className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {blockTime(block.start, block.end)}
                            </p>
                            <p className="text-xs capitalize text-slate-500">
                              {block.label} slot
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-emerald-700">
                            {block.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Collaborators</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.topCollaborators.map((collaborator) => (
                        <div
                          key={collaborator.email}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-slate-600">
                            {collaborator.email}
                          </span>
                          <span className="font-semibold">{collaborator.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Recurring load</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.recurringMeetings.length ? (
                        analytics.recurringMeetings.slice(0, 4).map((event) => (
                          <div
                            key={event.id}
                            className="rounded-md bg-slate-50 px-3 py-2"
                          >
                            <p className="truncate text-sm font-medium">
                              {event.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {eventTime(event)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No recurring meetings detected in the current window.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Solo busy blocks</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.busyBlocks.length ? (
                        analytics.busyBlocks.slice(0, 4).map((event) => (
                          <div
                            key={event.id}
                            className="rounded-md bg-slate-50 px-3 py-2"
                          >
                            <p className="truncate text-sm font-medium">
                              {event.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {eventTime(event)} · blocks availability
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No solo or long busy blocks detected.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold">Back-to-back risks</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.backToBackPairs.length ? (
                        analytics.backToBackPairs.slice(0, 3).map((pair) => (
                          <div
                            key={`${pair.first.id}-${pair.second.id}`}
                            className="rounded-md bg-amber-50 px-3 py-2"
                          >
                            <p className="truncate text-sm font-medium text-amber-950">
                              {pair.first.title}
                            </p>
                            <p className="truncate text-sm font-medium text-amber-950">
                              {pair.second.title}
                            </p>
                            <p className="text-xs text-amber-700">
                              Add a buffer or move one meeting.
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No tight back-to-back handoffs detected.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <aside className="rounded-lg border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)]">
              <div className="flex h-full min-h-[620px] flex-col">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareText size={18} className="text-emerald-700" />
                    <h2 className="font-semibold">Calendar agent</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Ask about time spend, meeting reduction, or scheduling drafts.
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "ml-8 rounded-lg bg-slate-950 p-3 text-sm leading-6 text-white"
                          : "mr-8 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                      }
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.role === "assistant" ? (
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {message.openai === "ok"
                              ? "OpenAI"
                              : message.openai === "quota_or_rate_limit"
                                ? "OpenAI quota fallback"
                                : message.mode === "openai"
                                  ? "OpenAI"
                                  : "Deterministic"}
                          </span>
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy size={13} />
                            Copy
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {chatLoading ? (
                    <div className="mr-8 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      <Loader2 className="animate-spin" size={16} />
                      Thinking through the calendar
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {promptChips.map((prompt) => (
                      <button
                        key={prompt}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        onClick={() => sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendMessage(input);
                    }}
                  >
                    <input
                      className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-600 transition placeholder:text-slate-400 focus:ring-2"
                      placeholder="Ask your calendar agent..."
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                    />
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={chatLoading || !input.trim()}
                      aria-label="Send message"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
