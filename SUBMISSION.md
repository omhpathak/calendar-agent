# Submission Checklist

## Demo Flow

1. Open the deployed app.
2. Start in sample mode to show the product without OAuth friction.
3. Point out the dashboard:
   - meeting load
   - average meeting length
   - busiest day
   - best free block
   - upcoming meetings
   - schedule health insights
   - recurring load
   - collaborators
4. Ask: `How much of my time am I spending in meetings?`
5. Ask: `How would you recommend I decrease that?`
6. Ask: `Draft an email to Joe, Dan, and Sally while keeping mornings free.`
7. Show the copyable email draft.
8. Connect Google Calendar if the OAuth test user is configured and show live mode.

## Architecture Talking Points

- The app separates deterministic calendar computation from LLM behavior.
- Google Calendar events are normalized into one internal event shape.
- Meeting hours, availability, back-to-back detection, recurring meeting detection, and collaborator counts are computed in TypeScript.
- The chat route sends the model a compact calendar summary, not an unbounded raw dump.
- The agent is read-only: it can recommend and draft, but it cannot create events or send email.
- Sample mode exists so reviewers can evaluate the app even if Google OAuth test-user access is not configured.

## Production Tradeoffs

- Add explicit event creation only after confirmation UI and stricter OAuth scopes.
- Add Gmail draft creation as a separate optional integration.
- Persist user preferences such as working hours, workout blocks, and preferred meeting lengths.
- Add background calendar sync instead of fetching on page load.
- Add evals for agent responses and observability for OpenAI requests.
- Add organization-level privacy controls and event redaction.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add environment variables:

```env
NEXTAUTH_SECRET=generate-a-new-production-secret
NEXTAUTH_URL=https://YOUR_APP.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=optional-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_DISABLED=false
```

4. In Google Cloud Console, add:

```text
Authorized JavaScript origin:
https://YOUR_APP.vercel.app

Authorized redirect URI:
https://YOUR_APP.vercel.app/api/auth/callback/google
```

5. If the OAuth app is in testing mode, add reviewer accounts as test users or direct reviewers to sample mode.

## Local Verification

```bash
npm run lint
npm run build
npm run dev
```

Local app:

```text
http://localhost:3000
```
