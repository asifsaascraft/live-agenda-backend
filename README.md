# AROICON 2026 — "Share My Agenda on WhatsApp" backend

One public POST API. The browser sends name + mobile number + the saved topic ids; the server
builds the agenda PDF, hosts it at a public URL, asks AiSensy to send it as the WhatsApp template's
**document attachment** (like the AIG screenshot), and stores name, number and `sentAt` in MongoDB.

```
POST /api/public/agenda/share-whatsapp
```

## 1. Files

```
models/agendaShare.model.js                       Mongoose model (name, phone, sentAt, status, ...)
controllers/agendaShare.controller.js             validation + HTTP responses
routes/agendaShare.routes.js                      POST route + public PDF static hosting
middleware/agendaShareRateLimit.middleware.js     per-IP limiter
services/agendaShare.service.js                   orchestration (throttle -> topics -> PDF -> AiSensy -> DB)
services/agendaPdf.service.js                     PDF builder (pdfkit)
services/agendaFileStorage.service.js             public hosting + 48 h purge
services/aisensyWhatsApp.js                       YOUR helper, refactored (registration function unchanged)
utils/phone.util.js                               E.164 normaliser
.env.example
```

Files are ESM (like your helper: `export const ...`) and import with the `.js` extension.

## 2. Install

```bash
npm i pdfkit          # express + mongoose are already in your project
```

Node 18+ (global `fetch`). Copy the folders into your backend, then **adjust one import** in
`services/agendaShare.service.js`:

```js
import Topic from "../models/topic.model.js";   // your real Topic model
```

`loadTopics()` populates `sessionId` (-> `hallId.hallName`, `trackId.trackName`, `chairperson.fullName`)
and `facultyId / moderatorId / panelistId / expertPanelistId` (`fullName`) — the same shape as
`GET /api/public/topics`. If you already have a service behind that endpoint, call it there instead.
Also check `ref: "Topic"` in the model matches your model's registered name.

## 3. Mount the routes

```js
import agendaShareRouter, { agendaFilesStatic, AGENDA_FILES_ROUTE } from "./routes/agendaShare.routes.js";

app.set("trust proxy", 1);                               // only if behind nginx / a load balancer
app.use("/api/public/agenda", agendaShareRouter);        // POST /api/public/agenda/share-whatsapp
app.use(AGENDA_FILES_ROUTE, agendaFilesStatic());        // GET  /agenda-files/<random>.pdf
```

Mount them **before** any auth middleware / catch-all 404, and after your CORS middleware.
The PDF URL must be openable by anyone without login — AiSensy downloads it from there.

## 4. Environment

Copy `.env.example`. Required for this feature:
`AISENSY_API_KEY`, `AISENSY_AGENDA_CAMPAIGN_NAME`, `AGENDA_PUBLIC_BASE_URL`, `AGENDA_SITE_URL`.
If any is missing the API answers `503` (and logs which one) instead of failing mysteriously.

## 5. Create the AiSensy template + campaign (do this first; Meta approval takes time)

1. AiSensy → **Templates → Create**: category *Utility*, language English.
2. **Header: Document** (upload any sample PDF for Meta's review).
3. **Body** (variables must be numbered exactly like this):

```
Dear {{1}}, your {{2}} personal agenda with {{3}} saved topics is attached. The latest programme is always available at {{4}}.
```
   Sample values for review: `Dr. Anita Sharma`, `AROICON 2026`, `5`, `https://aroicon2026.com`.
4. After approval: **Campaigns → + Launch → API Campaign**, pick this template, set it **Live**, copy the
   campaign name into `AISENSY_AGENDA_CAMPAIGN_NAME`.
5. Use a **separate campaign** from your registration campaign (different template).

### Variable injection (what the code sends)

| Template | Value | Source |
|----------|-------|--------|
| `{{1}}` | recipient name | form field `name` |
| `{{2}}` | `AROICON 2026` | `EVENT_INFO.name` |
| `{{3}}` | number of saved topics found | counted from the database |
| `{{4}}` | website | `AGENDA_SITE_URL` |
| header document | `media: { url, filename }` | hosted PDF + `AROICON-2026-Agenda-<Name>.pdf` |

`templateParams` must contain exactly as many entries as the template has variables, otherwise
AiSensy rejects the request. If you edit the template text, update `sendAgendaWhatsApp()` in
`services/aisensyWhatsApp.js` to match. Values are sanitised (no newlines/tabs/4+ spaces, never empty)
because WhatsApp rejects those.

## 6. API contract

Request:

```json
{
  "event": "AROICON 2026",
  "recipient": { "name": "Dr. Anita Sharma", "phone": "+919876543210" },
  "topicIds": ["6afb04d7a66fce48316c89fb", "6afb06c0a66fce48316c89ff"]
}
```

`phone`: Indian numbers in any common format, or international with `+` / `00`; normalised to E.164.
`topicIds`: 1–200 Mongo ObjectIds (duplicates removed, unknown ids ignored).

| HTTP | When | Body |
|------|------|------|
| 200 | AiSensy accepted the message | `{ success: true, message, data: { sentAt, topicCount, sessionCount } }` |
| 400 | invalid name / phone / topicIds | `{ success: false, message, errors }` |
| 404 | none of the topic ids exist | `{ success: false, message, code: "NO_TOPICS" }` |
| 429 | per-IP or per-phone limit / cooldown | `{ success: false, message, code }` |
| 502 | AiSensy rejected / unreachable | generic message (details only in server log) |
| 503 | missing server configuration | generic message |
| 500 | anything else | generic message |

`message` is always safe to show to end users.

**"200" means AiSensy accepted the message for delivery — not that it was delivered.** If the number is
not on WhatsApp, WhatsApp reports that later. To track real delivery add an AiSensy webhook and update
`AgendaShare` by `providerMessageId` (not included).

## 7. What gets stored (`AgendaShare`)

`name`, `phone` (E.164), `sentAt` (only when accepted), `status` (`pending|sent|failed`), `topicIds`,
`topicCount`, `sessionCount`, `pdfFileName`, `providerMessageId`, `providerResponse`, `failureReason`,
`ipAddress`, `createdAt`, `updatedAt`. Failed attempts are stored too (with `sentAt: null`).
You are keeping personal data: show a short consent line next to the Share button and decide a
retention period.

## 8. Abuse protection (this endpoint is public and makes your WhatsApp number message people)

* per phone: 3 successful/pending requests per hour + 30 s cooldown (database-backed; failures don't count)
* per IP: 10 requests / 10 min (in memory; use `express-rate-limit` + Redis if you run several instances)
* body limit 50 KB, ≤ 200 topics, strict validation, random unguessable PDF names, PDFs deleted after 48 h
* Recommended extra: CAPTCHA (e.g. Cloudflare Turnstile) before the request. Not included.

## 9. Local testing

Localhost cannot work end-to-end: AiSensy must download the PDF from `AGENDA_PUBLIC_BASE_URL`.
Expose your dev server with a tunnel (ngrok / cloudflared) and set `AGENDA_PUBLIC_BASE_URL` to the
https URL. Then:

```bash
curl -X POST http://localhost:5000/api/public/agenda/share-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"recipient":{"name":"Test User","phone":"9876543210"},"topicIds":["<a real topic _id>"]}'
```

Open the URL printed in `media.url` (add a `console.log` temporarily) to see the PDF.

## 10. Production notes

* **Several instances / serverless / Docker without a volume:** local disk is not shared. Replace
  `savePdf()` in `agendaFileStorage.service.js` with an S3/Cloudinary upload returning a public https URL.
* **Fonts:** the built-in font covers Latin text. For Devanagari/Telugu/Arabic names set
  `AGENDA_PDF_FONT_REGULAR/BOLD` to a Noto Sans `.ttf`. Without it, unsupported characters are
  transliterated or shown as `?`.
* **CORS:** the web app calls this endpoint from the browser with `credentials: "omit"`, so allow its
  origin, the `POST` and `OPTIONS` methods and the `Content-Type` header.
* **WhatsApp rules:** the first message to a number is a template (as here). The category may be
  re-classified by Meta (Utility vs Marketing), which affects pricing.

## 11. Verified

Tested end-to-end with a mock AiSensy and an in-memory database stand-in (real Express router,
controller, service, PDF builder, file hosting): validation, payload sent to AiSensy (destination,
4 params, media url/filename), PDF download from the public URL, record lifecycle, provider failures
(HTTP 400, `success:false`, timeout, network) → 502 with no provider text or API key leaked, per-phone
and per-IP limits, missing-config → 503, 48 h purge, schema validation; PDF output visually checked
(multi-page, cards not split, "(continued)" headers, page numbers).
**Not tested here:** a real MongoDB, your real Topic model/populate, and a real AiSensy/WhatsApp send.
