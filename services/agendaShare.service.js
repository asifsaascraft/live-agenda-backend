import AgendaShare from "../models/agendaShare.model.js";
import { sendAgendaPDFWhatsApp } from "./agendaWhatsApp.service.js";
import { saveAgendaPdf } from "./agendaFileStorage.service.js";
import { buildPdfFileName, generateAgendaPdf, groupTopicsForPdf } from "./agendaPdf.service.js";


export class AgendaShareError extends Error {
  constructor(status, message, code, requestId = null) {
    super(message);
    this.name = "AgendaShareError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}


let fullAgendaQueue = Promise.resolve();
const withFullAgendaLock = (task) => {
  const current = fullAgendaQueue.then(task, task);
  fullAgendaQueue = current.then(() => undefined, () => undefined);
  return current;
};



async function fetchAgendaSourceTopics() {
  const sourceUrl = process.env.AGENDA_SOURCE_API_URL?.trim();
  if (!sourceUrl) {
    throw new AgendaShareError(503, "Agenda sharing is temporarily unavailable.", "AGENDA_API_UNAVAILABLE");
  }


  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new AgendaShareError(503, "Agenda sharing is temporarily unavailable.", "AGENDA_API_UNAVAILABLE");
  }
  if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
    throw new AgendaShareError(503, "Agenda sharing is temporarily unavailable.", "AGENDA_API_UNAVAILABLE");
  }


  let response;
  try {
    response = await fetch(parsedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(Math.max(1000, Number(process.env.AGENDA_SOURCE_API_TIMEOUT_MS) || 10000)),
    });
  } catch (error) {
    console.error("[agenda-share] agenda source API failed:", error?.name || "request error");
    throw new AgendaShareError(502, "We couldn't load the latest agenda. Please try again later.", "AGENDA_API_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new AgendaShareError(502, "We couldn't load the latest agenda. Please try again later.", "AGENDA_API_UNAVAILABLE");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AgendaShareError(502, "The agenda service returned an invalid response.", "AGENDA_INVALID_DATA");
  }

  const topics = payload?.success === true ? payload?.data?.topics : null;
  if (!Array.isArray(topics)) {
    throw new AgendaShareError(502, "The agenda service returned an invalid response.", "AGENDA_INVALID_DATA");
  }
  if (topics.length === 0) {
    throw new AgendaShareError(404, "The agenda is currently empty.", "AGENDA_EMPTY");
  }

  return topics;
}


function validateSourceTopics(topics) {
  for (const topic of topics) {
    const session = topic?.sessionId;
    if (!topic?._id || !String(topic.topicName || "").trim() || !session?._id || !session.sessionDate || Number.isNaN(new Date(session.sessionDate).getTime())) {
      throw new AgendaShareError(502, "The latest agenda contains incomplete data. Please contact the event team.", "AGENDA_INVALID_DATA");
    }
  }
}


const providerMessageIdOf = (response) =>
  response?.submitted_message_id || response?.messageId || response?.message_id || response?.id || null;


async function processRequest({ name, mobile, topicIds, requestType, ipAddress }) {
  const share = await AgendaShare.create({
    requestType: requestType === "saved" ? "MY_SAVED_AGENDA" : "FULL_AGENDA",
    name,
    mobile,
    topicIds: requestType === "saved" ? topicIds : [],
    ipAddress: ipAddress || null,
    status: "PROCESSING",
  });
  let stage = "configuration";

  try {
    const requiredConfig = [
      "AISENSY_API_KEY",
      "AISENSY_AGENDA_CAMPAIGN_NAME",
      "AGENDA_WEBSITE_URL",
      "AGENDA_SOURCE_API_URL",
      "AWS_REGION",
      "AWS_BUCKET_NAME",
    ];
    const missingConfig = requiredConfig.filter((key) => !process.env[key]?.trim());
    if (missingConfig.length) {
      throw new AgendaShareError(503, "Agenda sharing is temporarily unavailable. Please try again later.", "AGENDA_CONFIGURATION_MISSING", share.id);
    }
    stage = "agenda_source";

    const preparePdfAndUpload = async () => {
      const sourceTopics = await fetchAgendaSourceTopics();
      validateSourceTopics(sourceTopics);

      const topics = requestType === "saved"
        ? sourceTopics.filter((topic) => topicIds.includes(String(topic._id)))
        : sourceTopics;

      if (requestType === "saved" && topics.length !== topicIds.length) {
        throw new AgendaShareError(404, "Some saved topics are no longer available. Please refresh your agenda and try again.", "TOPICS_NOT_FOUND", share.id);
      }
      if (topics.length === 0) {
        throw new AgendaShareError(404, "No topics were found for this agenda.", "AGENDA_EMPTY", share.id);
      }


      const groups = groupTopicsForPdf(topics);
      if (!groups.topicCount) {
        throw new AgendaShareError(404, "No topics could be added to the PDF agenda.", "AGENDA_EMPTY", share.id);
      }


      stage = "pdf_generation";
      share.topicIds = groups.sessions.flatMap((session) => session.topics.map((topic) => topic.id));
      share.topicCount = groups.topicCount;
      share.sessionCount = groups.sessionCount;
      share.pdfFilename = buildPdfFileName({ recipientName: name, mode: requestType });
      await share.save();


      const pdfBuffer = await generateAgendaPdf({
        recipientName: requestType === "saved" ? name : "",
        groups,
        mode: requestType,
      });
      if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 100) {
        throw new AgendaShareError(500, "We couldn't prepare the agenda PDF. Please try again.", "PDF_GENERATION_FAILED", share.id);
      }
      share.pdfStatus = "COMPLETED";
      await share.save();


      stage = "pdf_upload";
      const storedPdf = await saveAgendaPdf(pdfBuffer, {
        mode: requestType,
        filename: share.pdfFilename,
      });
      share.storageStatus = "COMPLETED";
      share.pdfUrl = storedPdf.publicUrl;
      share.s3Key = storedPdf.key;
      share.expiresAt = storedPdf.expiresAt;
      await share.save();
      return { groups, storedPdf };
    };


    // Saved agendas run independently. Full agenda fetch + generation + fixed-key
    // upload is serialized, while WhatsApp sending happens outside the lock.
    const prepared = requestType === "full"
      ? await withFullAgendaLock(preparePdfAndUpload)
      : await preparePdfAndUpload();

    stage = "whatsapp";
    const providerResponse = await sendAgendaPDFWhatsApp({
      phone: mobile,
      delegateName: name,
      topicCount: prepared.groups.topicCount,
      pdfUrl: prepared.storedPdf.publicUrl,
      pdfFilename: share.pdfFilename,
    });
    if (providerResponse?.success === false || providerResponse?.status === "error") {
      throw new Error("AiSensy did not accept the request.");
    }

    share.whatsappStatus = "ACCEPTED";
    share.providerMessageId = providerMessageIdOf(providerResponse);
    share.status = "COMPLETED";
    try {
      await share.save();
    } catch (saveError) {
      // AiSensy already accepted the message; do not misreport it as failed.
      console.error("[agenda-share] accepted message could not be saved to request history:", saveError?.message);
    }


    return {
      requestId: String(share._id),
      requestType: share.requestType,
      topicCount: prepared.groups.topicCount,
      sessionCount: prepared.groups.sessionCount,
      status: "COMPLETED",
      ...(requestType === "full" ? { agendaUrl: prepared.storedPdf.publicUrl } : {}),
    };
  } catch (error) {
    const safeError = error instanceof AgendaShareError ? error : null;
    share.status = "FAILED";
    share.failureStage = stage;
    share.failureReason = (safeError?.code || error?.name || "ERROR").slice(0, 100);
    if (stage === "pdf_generation") share.pdfStatus = "FAILED";
    if (stage === "pdf_upload") share.storageStatus = "FAILED";
    if (stage === "whatsapp") share.whatsappStatus = "FAILED";
    try {
      await share.save();
    } catch (saveError) {
      console.error("[agenda-share] request history update failed:", saveError?.message);
    }

    if (safeError) {
      safeError.requestId = String(share._id);
      throw safeError;
    }
    console.error("[agenda-share] request failed at %s:", stage, error?.message || "unknown error");
    const status = stage === "configuration" ? 503 : stage === "whatsapp" || stage === "agenda_source" || stage === "pdf_upload" ? 502 : 500;
    const code = stage === "configuration" ? "AGENDA_CONFIGURATION_MISSING" : stage === "whatsapp" ? "WHATSAPP_SEND_FAILED" : stage === "agenda_source" ? "AGENDA_API_UNAVAILABLE" : stage === "pdf_upload" ? "PDF_UPLOAD_FAILED" : "PDF_GENERATION_FAILED";
    const message = stage === "whatsapp"
      ? "We couldn't send your agenda on WhatsApp right now. Please try again shortly."
      : stage === "agenda_source"
        ? "We couldn't load the latest agenda. Please try again later."
        : stage === "configuration"
          ? "Agenda sharing is temporarily unavailable. Please try again later."
          : "We couldn't prepare your agenda PDF. Please try again.";
    throw new AgendaShareError(status, message, code, String(share._id));
  }
}

export async function shareAgendaWhatsApp(args) {
  return processRequest(args);
}
