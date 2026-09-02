# Submission status

Deadline: **2026-09-03 13:00 PDT / 2026-09-04 05:00 JST**. Changes are free
until then and forbidden after — including changes to the repo and the live URL,
since judging reads the submitted snapshot.

## Done

| Requirement | State |
| --- | --- |
| Public repo with an OSS licence | https://github.com/isaka1022/typecase — MIT, detected by GitHub |
| Working live URL | https://typecase.vercel.app |
| Text description | `docs/submission.md`, with the Devpost field mapping |
| Demo video | Narration rendered (v1, 2:33); **filming and upload still open** |

Cover image for the Devpost gallery: `.media/stills/typecase-cover.png`.

## Open

1. **Film the demo.** ChatGPT's in-app browser, five prompts, screen recording.
   `docs/video-script.md` has the script, the shot list, and the three checks to
   run before rolling. Neither Claude in Chrome nor Codex can stand in here:
   ChatGPT's browser is not automatable from this machine, and neither agent is
   a WebMCP client, so the one shot worth filming — an agent calling a declared
   tool and being refused — cannot be staged by them.
2. **Cut the video** against the rendered narration and upload to YouTube,
   public, under 3 minutes, audio required.
3. **Submit on Devpost.** Can be done before the video exists; the form accepts
   edits until the deadline.

## What rehearsing against the deployed page taught us

Read this before touching the demo, the rules, or the tools.

- **Progress persists in localStorage.** A page that already has lesson 2 open
  does not show the lesson-1 tool surface. Reset before filming or testing.
- **The measure is read off the rendering, so window width changes the
  diagnosis.** At 1280 the page reports 73 characters and `measure` passes
  before the agent has done anything, which removes the opening fault the script
  is built on. Film at 1440 or wider and confirm the panel says three faults.
- **The polyfill's `executeTool` takes the tool object, not its name**, unlike
  Chromium's. And a tool whose descriptor changed is re-registered, so a handle
  held across a state change throws `Tool unregistered` — re-read `getTools()`
  before every call.
- A refusal used to give the wrong reason (fixed in `13abf0e`): `set_control`
  checked the lesson enum before the store, so a handed-over control came back
  as "not available yet". The store owns that refusal now.

## Rebuilding pieces

```bash
npm run typecheck && npm run test && npm run build   # 28 tests
node tools/narrate.mjs                               # narration; needs GMI_API_KEY
env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID \
  npx vercel --prod --archive=tgz --yes --scope ryukzm
```

`tools/narrate.mjs` keeps existing mp3s and only renders what is missing, so
editing one section means deleting that one file. The GMI queue leaves requests
sitting often enough that the script resubmits rather than waiting longer.

Working media lives in `.media/`, which is git-ignored — it is not part of what
the judges clone.
