import mongoose from "mongoose";
import { normalizePhoneToE164 } from "./phone.utils.js";

const MAX_NAME_LENGTH = 80;
const MAX_SAVED_TOPICS = 200;


export function validateAgendaShareRequest(body, requestType) {
  const source = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const errors = {};

  const name = String(source.name ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  else if (!/\p{L}/u.test(name)) errors.name = "Please enter a valid name.";

  const mobile = normalizePhoneToE164(source.mobile);
  if (!mobile) {
    errors.mobile = "Enter a valid WhatsApp mobile number with country code for international numbers.";
  }

  let topicIds = [];
  if (requestType === "saved") {
    if (!Array.isArray(source.topicIds) || source.topicIds.length === 0) {
      errors.topicIds = "Save at least one topic to your agenda before sharing.";
    } else if (source.topicIds.length > MAX_SAVED_TOPICS) {
      errors.topicIds = `You can share up to ${MAX_SAVED_TOPICS} topics at a time.`;
    } else if (source.topicIds.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))) {
      errors.topicIds = "Some saved topics are invalid. Please refresh the agenda and try again.";
    } else {
      topicIds = [...new Set(source.topicIds.map((id) => String(id)))];
    }
  }


  if (Object.keys(errors).length) {
    return { ok: false, message: Object.values(errors)[0], errors };
  }

  return { ok: true, value: { name, mobile, topicIds } };
}


export function validateAgendaShareRequestMiddleware(requestType) {
  return (req, res, next) => {
    const result = validateAgendaShareRequest(req.body, requestType);
    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: { code: "VALIDATION_ERROR" },
        errors: result.errors,
      });
    }
    req.agendaShareRequest = result.value;
    req.agendaShareRequestType = requestType;
    next();
  };
}
