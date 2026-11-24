import { normalizePhoneToE164, toAiSensyDestination } from "../utils/phone.utils.js";

const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";


export async function sendAgendaPDFWhatsApp({ phone, delegateName, topicCount, pdfUrl, pdfFilename }) {
  const apiKey = process.env.AISENSY_API_KEY;
  const campaignName = process.env.AISENSY_AGENDA_CAMPAIGN_NAME;
  const websiteUrl = process.env.AGENDA_WEBSITE_URL;

  if (!apiKey || !campaignName || !websiteUrl) {
    throw new Error("AiSensy agenda configuration is missing.");
  }
  if (!delegateName || !phone || !pdfUrl || !pdfFilename) {
    throw new Error("Required agenda WhatsApp data is missing.");
  }
  if (!Number.isInteger(Number(topicCount)) || Number(topicCount) < 1) {
    throw new Error("Agenda topic count is invalid.");
  }

  const normalizedPhone = normalizePhoneToE164(phone);
  if (!normalizedPhone) throw new Error("Invalid WhatsApp mobile number.");

  let documentUrl;
  let website;
  try {
    documentUrl = new URL(pdfUrl);
    website = new URL(websiteUrl);
  } catch {
    throw new Error("Agenda document or website URL is invalid.");
  }
  if (documentUrl.protocol !== "https:" || website.protocol !== "https:") {
    throw new Error("Agenda document and website URLs must use HTTPS.");
  }
  if (!String(pdfFilename).toLowerCase().endsWith(".pdf")) {
    throw new Error("Agenda attachment must be a PDF.");
  }

  const payload = {
    apiKey,
    campaignName,
    destination: toAiSensyDestination(normalizedPhone),
    userName: String(delegateName).trim(),
    media: { url: documentUrl.href, filename: pdfFilename },
    templateParams: [
      String(delegateName).trim(),
      String(topicCount),
      website.href,
    ],
  };


  const timeoutMs = Math.max(1000, Number(process.env.AISENSY_REQUEST_TIMEOUT_MS) || 15000);
  const response = await fetch(AISENSY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AiSensy request failed with HTTP ${response.status}.`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { response: responseText };
  }
}
