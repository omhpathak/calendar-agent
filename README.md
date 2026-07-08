# Calendar Agent

Calendar Agent is a React/Next.js calendar agent. It authenticates with Google Calendar, pulls upcoming events, computes calendar intelligence, and gives users a chat agent for meeting-load analysis, availability planning, and copyable scheduling email drafts.

The app is intentionally read-only. It can recommend changes and draft messages, but it does not create calendar events or send emails.

Live app:

```text
https://calendar-agent-beta.vercel.app
```

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The app works immediately in **Sample mode**. To use live Google Calendar and OpenAI, configure `.env.local` as described below.

## Features

- **Google Calendar authentication**
  - Google OAuth through NextAuth
  - Calendar events read-only scope
  - Live calendar mode for the signed-in user

- **Sample mode**
  - Demo-safe seeded calendar data
  - Works without Google OAuth
  - Useful for reviewers who are not added as Google OAuth test users

- **Calendar dashboard**
  - Meeting load
  - Meeting count
  - Busiest day
  - Best free block
  - Upcoming meetings list
  - Schedule health insights

- **Calendar preview**
  - Five-day visual calendar grid
  - Shows events across working hours
  - Visually separates meetings from busy blocks

- **Meeting vs busy-block classification**
  - Collaboration meetings count toward meeting load
  - Solo or long busy blocks, such as shifts/focus blocks, block availability but are excluded from meeting-load math
  - Prevents work blocks like `9-5 Gig` from appearing as hundreds of meeting hours

- **Availability engine**
  - Computes working-hour free blocks
  - Ranks useful scheduling slots
  - Supports requests like keeping mornings free

- **Calendar agent chat**
  - Answers meeting-load questions
  - Recommends ways to decrease meeting load
  - Finds available meeting slots
  - Drafts copyable scheduling emails
  - Uses OpenAI when configured
  - Falls back to deterministic calendar logic if OpenAI is disabled or unavailable

- **Leadership-oriented insights**
  - Recurring meeting audit
  - Top collaborators
  - Back-to-back meeting risks
  - Focus-time availability
  - Busy-block visibility

## Example Prompts

```text
How much of my time am I spending in meetings?
```

```text
How would you recommend I decrease my meeting load?
```

```text
Find three 30 minute times this week for a meeting.
```

```text
I have three meetings I need to schedule with Joe, Dan, and Sally. I really want to block my mornings off to work out, so can you write me an email draft I can share with each of them?
```

```text
Act like my chief of staff. What should I move, shorten, or decline this week?
```

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- NextAuth
- Google Calendar API via `googleapis`
- OpenAI API
- date-fns
- lucide-react
- Vercel

## Environment Variables

Create `.env.local`:

```env
NEXTAUTH_SECRET=replace-with-random-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret

OPENAI_API_KEY=replace-with-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_DISABLED=false
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

If you want to run without OpenAI:

```env
OPENAI_DISABLED=true
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Validate before deploying:

```bash
npm run lint
npm run build
```

## Google OAuth Setup

In Google Cloud Console:

1. Create or select a project.
2. Enable the **Google Calendar API**.
3. Configure the OAuth consent screen.
4. Add yourself as a test user if the app is in Testing mode.
5. Create an OAuth Client ID for a **Web application**.
6. Add this local JavaScript origin:

```text
http://localhost:3000
```

7. Add this local redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

8. Add these OAuth scopes:

```text
openid
email
profile
https://www.googleapis.com/auth/calendar.events.readonly
```

The app only needs `calendar.events.readonly`; it does not request write access.

## Production Deployment

The app is deployed on Vercel.

### Deploy From Terminal

```bash
npx vercel --prod
```

When prompted:

```text
Project name: calendar-agent
Framework: Next.js
Customize settings: No
```

### Vercel Environment Variables

Set these in Vercel for Production:

```env
NEXTAUTH_SECRET=production-random-secret
NEXTAUTH_URL=https://YOUR_APP.vercel.app

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_DISABLED=false
```

For this deployment:

```env
NEXTAUTH_URL=https://calendar-agent-beta.vercel.app
```

After changing environment variables, redeploy:

```bash
npx vercel --prod
```

### Google OAuth Production URLs

In the Google OAuth client, add:

Authorized JavaScript origin:

```text
https://calendar-agent-beta.vercel.app
```

Authorized redirect URI:

```text
https://calendar-agent-beta.vercel.app/api/auth/callback/google
```

If you deploy under a different domain, add that domain with the same callback path.

## Architecture

```text
React UI
  |
  |-- NextAuth Google OAuth
  |
  |-- /api/calendar
  |     |-- Google Calendar API when signed in
  |     |-- sample calendar fallback
  |     |-- event normalization
  |     |-- meeting vs busy-block classification
  |     |-- deterministic analytics
  |
  |-- /api/chat
        |-- compact calendar summary
        |-- deterministic availability + analytics
        |-- OpenAI response when configured
        |-- deterministic fallback when unavailable
```

The key design choice is separating deterministic calendar computation from LLM behavior. Meeting load, free blocks, recurring meetings, busy-block classification, back-to-back detection, and availability ranking are computed in TypeScript. OpenAI is used for natural-language recommendations and email drafting.

Additional architecture notes are in `ARCHITECTURE.md`.

## Tradeoffs

- Calendar access is read-only for safety and faster OAuth approval.
- The app drafts emails instead of sending them.
- There is no database; analytics are computed from the current calendar fetch.
- Sample mode exists so reviewers can evaluate the product without OAuth friction.
- Production improvements would include durable user preferences, calendar event creation with explicit confirmation, Gmail draft integration, background sync, richer evals, and observability.
