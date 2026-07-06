# Calendar Copilot

Calendar Copilot is a React/Next.js take-home project for the Tenex Calendar Assistant prompt. It connects to Google Calendar, pulls upcoming events, computes schedule analytics deterministically, and gives the user a chat interface for calendar questions, availability planning, and copyable scheduling email drafts.

The app is intentionally read-only. It can recommend times and draft emails, but it does not create calendar events or send messages.

## Features

- Google sign-in with Calendar read-only access
- Live Google Calendar fetch for the next 30 days
- Sample mode that works without auth or credentials
- Meeting load, average meeting length, busiest day, and best free block metrics
- Upcoming meeting list with attendees and duration
- Schedule health insights for heavy days, scarce focus time, and back-to-back meetings
- Availability ranking during working hours
- Recurring meeting and collaborator summaries
- Chat interface for:
  - meeting-load questions
  - meeting reduction recommendations
  - availability search
  - copyable scheduling email drafts
- OpenAI-backed responses when `OPENAI_API_KEY` is set
- Deterministic fallback responses when OpenAI is not configured

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
  |     |-- deterministic analytics
  |
  |-- /api/chat
        |-- calendar summary
        |-- deterministic availability + analytics
        |-- OpenAI response when configured
        |-- deterministic fallback when not configured
```

The main product decision is to keep calendar math out of the LLM. Meeting hours, free blocks, back-to-back detection, recurring meeting detection, and availability scoring are all ordinary TypeScript functions. The LLM is used for explanation, recommendation wording, and email drafting.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
NEXTAUTH_SECRET=replace-with-random-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_DISABLED=false
```

Generate a local auth secret:

```bash
openssl rand -base64 32
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Google OAuth Setup

In Google Cloud Console:

1. Create or select a project.
2. Enable the Google Calendar API.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID for a Web application.
5. Add this local JavaScript origin:

```text
http://localhost:3000
```

6. Add this local redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

7. Add these scopes:

```text
openid
email
profile
https://www.googleapis.com/auth/calendar.readonly
```

For Vercel, add the deployed domain too:

```text
https://YOUR_APP.vercel.app
https://YOUR_APP.vercel.app/api/auth/callback/google
```

Then set:

```env
NEXTAUTH_URL=https://YOUR_APP.vercel.app
```

## OpenAI Setup

The app works without OpenAI by using deterministic fallback responses. To enable LLM-generated recommendations and drafts, set:

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_DISABLED=false
```

The chat route still uses deterministic calendar analytics as context. The model is instructed not to claim that it created events, sent email, or accessed Gmail.

For local demos without a valid funded API key, set:

```env
OPENAI_DISABLED=true
```

## Validation

```bash
npm run lint
npm run build
```

Both commands should pass before submission.

## Submission Notes

- See `ARCHITECTURE.md` for the system design and data flow.
- See `SUBMISSION.md` for the demo checklist, video talking points, and deployment checklist.

## Deployment

The easiest deployment target is Vercel:

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the environment variables from `.env.example`.
4. Add the Vercel callback URL to the Google OAuth client.
5. Redeploy.

If the Google OAuth app remains in testing mode, add reviewer/test accounts in Google Cloud or use sample mode for review access.

## Tradeoffs

- Read-only Calendar API access keeps the demo reliable and safer.
- No database is used; the app computes analytics from the current calendar fetch.
- Gmail is intentionally out of scope; email drafts are copyable text.
- Sample mode exists so reviewers can see the full product without OAuth friction.
- Production improvements would include durable user settings, background sync, calendar event creation with explicit confirmation, Gmail draft creation, richer evals for agent responses, and observability around LLM calls.
