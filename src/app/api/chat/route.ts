import OpenAI from "openai";
import { NextResponse } from "next/server";
import { deterministicAgentResponse } from "@/lib/agent/fallback";
import { analyzeCalendar, summarizeForAgent } from "@/lib/calendar/analytics";
import type { CalendarEvent } from "@/lib/calendar/types";

type ChatRequest = {
  message?: string;
  events?: CalendarEvent[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const message = body.message?.trim();
  const events = body.events ?? [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const analytics = analyzeCalendar(events);

  const openAiDisabled = process.env.OPENAI_DISABLED === "true";

  if (openAiDisabled || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      mode: "fallback",
      content: deterministicAgentResponse(message, events, analytics),
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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
      content:
        completion.choices[0]?.message?.content ??
        deterministicAgentResponse(message, events, analytics),
    });
  } catch (error) {
    return NextResponse.json({
      mode: "fallback",
      content: deterministicAgentResponse(message, events, analytics),
      warning:
        error instanceof Error
          ? `OpenAI request failed: ${error.message}`
          : "OpenAI request failed.",
    });
  }
}
