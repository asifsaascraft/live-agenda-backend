# Frontend integration guide — Share My Agenda on WhatsApp

The agenda UI you already have (`ShareAgendaDialog` → `agenda-share.service.ts`) was built for exactly
this API. Integration is mostly **configuration**; there is no new UI to write.

## 1. How it works end to end

```
User taps ★ on topics                      -> topic ids saved in localStorage (My Agenda)
My Agenda sheet -> Share                   -> dialog: name + WhatsApp number
Share on WhatsApp                          -> POST /api/public/agenda/share-whatsapp
Backend: validate -> load topics -> build PDF -> host PDF -> AiSensy -> save record
User's WhatsApp                            -> template message + PDF attachment
```

The browser never sees the PDF, the AiSensy key or the PDF URL.

## 2. Configure the frontend (3 steps)

**Step 1 — set the endpoint** in `.env.local` (and in your hosting provider's environment):

```env
NEXT_PUBLIC_API_PUBLIC_URL=https://api.yourdomain.com        # already set; your api.ts uses it
NEXT_PUBLIC_AGENDA_SHARE_ENDPOINT=/api/public/agenda/share-whatsapp
```

The final URL is `NEXT_PUBLIC_API_PUBLIC_URL + endpoint`. If your base URL already ends in `/api`, use
`/public/agenda/share-whatsapp` (same rule as for `/api/public/topics`).

**Step 2 — restart / rebuild.** `NEXT_PUBLIC_*` values are inlined at build time: stop `next dev` and start
it again (or redeploy). Forgetting this is the #1 reason the dialog still says *"isn't available yet"*.

**Step 3 — CORS on the backend** must allow your frontend origin, the `POST` + `OPTIONS` methods and the
`Content-Type` header. The request uses `credentials: "omit"`, so you do **not** need
`Access-Control-Allow-Credentials`. (Symptom if wrong: browser console CORS error, UI shows
"We couldn't reach the server…".)

## 3. What the frontend sends

Built by `src/features/agenda/services/agenda-share.service.ts`:

```http
POST {NEXT_PUBLIC_API_PUBLIC_URL}/api/public/agenda/share-whatsapp
Content-Type: application/json

{
  "event": "AROICON 2026",
  "recipient": { "name": "Dr. Anita Sharma", "phone": "+919876543210" },
  "topicIds": ["6afb04d7a66fce48316c89fb", "6afb06c0a66fce48316c89ff"]
}
```

* `phone` is already validated and converted to E.164 by `validateShareForm()` (Indian numbers work
  without a country code; other countries need `+CC`). The backend re-validates it.
* `topicIds` = the favourites that still exist in the latest agenda data (`ShareAgendaDialog` receives
  them from `AgendaPage`). Only ids are sent — never agenda content — so nobody can forge a PDF.
* The request goes through your existing `api.ts` (timeout, JSON, error handling). Nothing else to wire.

## 4. What the frontend shows for each response

| Backend answer | `ApiError` | What the user sees |
|---|---|---|
| `200 { success:true }` | — | green box: "Your agenda has been sent to +91…" |
| `400` (bad input) | status 400 | the server's `message` (e.g. "Enter a valid mobile number…") |
| `404` (topics gone) | status 404 | "We couldn't find the saved topics. Please refresh…" |
| `429` | status 429 | "Too many requests…" (see optional patch below to show the specific message) |
| `502` / `503` / `500` | ≥ 500 | "The sharing service is having trouble right now…" |
| network / CORS / timeout | `NETWORK_ERROR` / `TIMEOUT` | "We couldn't reach the server…" / "This is taking too long…" |
| env var not set | — (no request) | "Sending to WhatsApp isn't available yet…" |

`api.ts` reads `message` from the JSON error body — the backend always provides a user-safe one.

## 5. Two small recommended patches

**(a) Success wording.** The backend answers 200 when AiSensy *accepts* the message; the phone may still
fail to receive it (e.g. not on WhatsApp). In `ShareAgendaDialog.tsx` change

```tsx
Your agenda has been sent to {status.phone}.
```
to
```tsx
Your agenda is on its way to {status.phone} on WhatsApp. It usually arrives within a minute.
```

**(b) Show the specific 429 message** (so users learn *why*). In `agenda-share.service.ts`, inside
`getShareErrorMessage`, replace

```ts
if (error.status === 429) return "Too many requests. Please wait a moment and try again.";
```
with
```ts
if (error.status === 429) return error.message || "Too many requests. Please wait a moment and try again.";
```

## 6. Recommended UX details

* The Share button is already disabled while sending (`Sending…`) and when there are no favourites — keep it.
* Add one line under the form: *"By sharing, you agree that we send your agenda to this number on
  WhatsApp."* (consent; you are storing name + number).
* The sheet reopens after the dialog closes, so users land back on their agenda.
* Do not add a `wa.me` fallback: it cannot attach the PDF and would contradict the success message.

## 7. Test plan

1. **API alone** (before touching the UI), from a terminal:
   ```bash
   curl -i -X POST "$API/api/public/agenda/share-whatsapp" \
     -H "Content-Type: application/json" \
     -d '{"recipient":{"name":"Test User","phone":"9876543210"},"topicIds":["<real topic _id>"]}'
   ```
   Expect `200` and a WhatsApp message with the PDF on that number. Then check MongoDB `agendashares`:
   `status: "sent"`, `sentAt` set.
2. **CORS**: open the agenda in the browser, DevTools → Network, press Share → the `share-whatsapp`
   request must show `200` (not a red CORS failure).
3. **UI validation**: empty name, `12345`, valid number → each shows the right message.
4. **Error path**: temporarily set a wrong `AISENSY_AGENDA_CAMPAIGN_NAME` → UI shows the friendly 502
   text, DB record `status: "failed"`, no technical text on screen.
5. **Limits**: send 4 times to the same number within an hour → the 4th is refused.
6. **Reload**: favourites still there; Share still works after a hard refresh.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Dialog says "isn't available yet" | `NEXT_PUBLIC_AGENDA_SHARE_ENDPOINT` missing or the app was not restarted/rebuilt |
| "We couldn't reach the server" | wrong base URL, backend down, or CORS (check the browser console) |
| 404 on the endpoint | router not mounted, or `/api` prefix doubled/missing (see step 1) |
| 503 from the API | a required env var is missing on the server (the log names it) |
| 502 from the API | read the server log `[agenda-share] AiSensy failed`: usually (a) campaign not Live / wrong name, (b) `templateParams` count ≠ template variables, (c) PDF URL not publicly reachable — `AGENDA_PUBLIC_BASE_URL` points to localhost/private network |
| 200 but nothing on WhatsApp | AiSensy accepted it; check AiSensy's message log (number not on WhatsApp, template paused, Meta quality limits) |
| PDF opens but names look like `?` | non-Latin names: configure a Unicode font on the server (README §10) |
