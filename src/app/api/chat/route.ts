import OpenAI from "openai";
import { NextResponse } from "next/server";
import { deterministicAgentResponse } from "@/lib/agent/fallback";
import { analyzeCalendar, summarizeForAgent } from "@/lib/calendar/analytics";
import type { CalendarEvent } from "@/lib/calendar/types";

type ChatRequest = {
  message?: string;
  events?: CalendarEvent[];
};

function openAiStatus() {
  const disabled = process.env.OPENAI_DISABLED === "true";
  const hasKey = Boolean(process.env.OPENAI_API_KEY);

  return {
    disabled,
    hasKey,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}

export async function GET() {
  return NextResponse.json(openAiStatus());
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const message = body.message?.trim();
  const events = body.events ?? [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const analytics = analyzeCalendar(events);

  const status = openAiStatus();

  if (status.disabled || !status.hasKey) {
    return NextResponse.json({
      mode: "fallback",
      openai: status.disabled ? "disabled" : "missing_key",
      content: deterministicAgentResponse(message, events, analytics),
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: status.model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are Calendar Copilot, a read-only calendar agent. Use the provided calendar context and deterministic analytics as your source of truth. Do not claim you created calendar events, edited meetings, sent emails, or accessed Gmail. For scheduling requests, recommend concrete slots from the provided availability blocks and draft copyable emails. For meeting-load questions, cite the computed metrics. If the context is insufficient, say exactly what is missing.",
        },
        {
          role: "user",
          content: `Calendar context:\n${JSON.stringify(
            summarizeForAgent(events, analytics),
            null,
            2,
          )}\n\nUser request:\n${message}`,
        },
      ],
    });

    return NextResponse.json({
      mode: "openai",
      openai: "ok",
      content:
        completion.choices[0]?.message?.content ??
        deterministicAgentResponse(message, events, analytics),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "OpenAI request failed.";
    return NextResponse.json({
      mode: "fallback",
      openai: errorMessage.includes("429")
        ? "quota_or_rate_limit"
        : errorMessage.includes("401")
          ? "invalid_key"
          : "request_failed",
      content: deterministicAgentResponse(message, events, analytics),
      warning: `OpenAI request failed: ${errorMessage}`,
    });
  }
}
