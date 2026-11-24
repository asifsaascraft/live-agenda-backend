import { createHash } from "node:crypto";
import AgendaShareRateLimit from "../models/agendaShareRateLimit.model.js";

const WINDOW_MS = () => Math.max(1, Number(process.env.AGENDA_SHARE_RATE_WINDOW_HOURS) || 24) * 60 * 60 * 1000;
const limitsFor = (type) => type === "saved"
  ? { phone: Number(process.env.AGENDA_SAVED_MAX_PER_MOBILE) || 5, ip: Number(process.env.AGENDA_SAVED_MAX_PER_IP) || 5 }
  : { phone: Number(process.env.AGENDA_FULL_MAX_PER_MOBILE) || 2, ip: Number(process.env.AGENDA_FULL_MAX_PER_IP) || 2 };
const hashKey = (value) => createHash("sha256").update(String(value)).digest("hex");


async function reserve({ requestType, dimension, value, max }) {
  const now = Date.now();
  const windowMs = WINDOW_MS();
  const windowId = Math.floor(now / windowMs);
  const key = `${requestType}:${dimension}:${hashKey(value)}:${windowId}`;
  const expiresAt = new Date((windowId + 1) * windowMs + 60_000);

  try {
    const updated = await AgendaShareRateLimit.findOneAndUpdate(
      { key, count: { $lt: max } },
      {
        $inc: { count: 1 },
        $setOnInsert: { key, requestType, dimension, windowId, expiresAt },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return { key, count: updated.count };
  } catch (error) {
    if (error?.code === 11000) return null; // atomic cap already reached
    throw error;
  }
}


async function release(reservation) {
  if (!reservation?.key) return;
  await AgendaShareRateLimit.updateOne({ key: reservation.key, count: { $gt: 0 } }, { $inc: { count: -1 } });
}


export const agendaShareRateLimit = (requestType) => async (req, res, next) => {
  let phoneReservation = null;
  try {
    const limits = limitsFor(requestType);
    phoneReservation = await reserve({
      requestType,
      dimension: "phone",
      value: req.agendaShareRequest.mobile,
      max: limits.phone,
    });

    if (!phoneReservation) {
      return res.status(429).json({
        success: false,
        message: "This WhatsApp number has reached its agenda sharing limit for the current 24-hour period.",
        error: { code: "RATE_LIMIT_EXCEEDED" },
      });
    }

    const ipReservation = await reserve({
      requestType,
      dimension: "ip",
      value: req.ip || "unknown",
      max: limits.ip,
    });

    if (!ipReservation) {
      try { await release(phoneReservation); } catch { /* best-effort rollback */ }
      return res.status(429).json({
        success: false,
        message: "Too many agenda requests from this network. Please try again later.",
        error: { code: "RATE_LIMIT_EXCEEDED" },
      });
    }

    req.agendaShareRateReservations = { phone: phoneReservation, ip: ipReservation };
    return next();
  } catch (error) {
    try { await release(phoneReservation); } catch { /* counter rollback is best-effort */ }
    console.error("[agenda-share] rate-limit check failed:", error?.message);
    return res.status(503).json({
      success: false,
      message: "Agenda sharing is temporarily unavailable. Please try again later.",
      error: { code: "RATE_LIMIT_SERVICE_UNAVAILABLE" },
    });
  }
};
