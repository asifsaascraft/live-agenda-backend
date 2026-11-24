import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";

const TIME_ZONE = process.env.AGENDA_TIME_ZONE || "Asia/Kolkata";
const MARGIN = 42;
const FOOTER_HEIGHT = 34;
const DAY_MINUTES = 24 * 60;
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });


const color = (value, fallback) => /^#[\da-f]{6}$/i.test(String(value || "")) ? value : fallback;
export const AGENDA_PDF_CONFIG = {
  conferenceName: process.env.CONFERENCE_NAME || process.env.AGENDA_EVENT_NAME || "Conference Programme",
  conferenceCode: process.env.CONFERENCE_CODE || "",
  dates: process.env.CONFERENCE_DATES || "",
  venue: process.env.CONFERENCE_VENUE || "",
  location: process.env.CONFERENCE_LOCATION || "",
  website: process.env.CONFERENCE_WEBSITE || process.env.AGENDA_WEBSITE_URL || "",
  title: process.env.AGENDA_PDF_TITLE || "Scientific Programme",
  subtitle: process.env.AGENDA_PDF_SUBTITLE || "Conference programme",
  footer: process.env.AGENDA_PDF_FOOTER_TEXT || "",
  primary: color(process.env.AGENDA_PDF_PRIMARY_COLOR, "#143B63"),
  secondary: color(process.env.AGENDA_PDF_SECONDARY_COLOR, "#EAF1F8"),
  accent: color(process.env.AGENDA_PDF_ACCENT_COLOR, "#F28C28"),
  showCover: process.env.AGENDA_PDF_SHOW_COVER !== "false",
  logoPath: process.env.AGENDA_PDF_LOGO_PATH || "",
};


const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const dateLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE, weekday: "long", day: "2-digit", month: "long", year: "numeric",
});
const generatedFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});


const clean = (value) => typeof value === "string" ? value.trim() : "";
const idOf = (value) => value && typeof value === "object" && value._id ? String(value._id) : value ? String(value) : "";

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const toDateKey = (value) => {
  const date = toDate(value);
  return date ? dateKeyFormatter.format(date) : null;
};

const timeToMinutes = (value) => {
  const text = clean(value);
  let match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const inputHour = Number(match[1]);
    const minute = Number(match[2]);
    if (inputHour < 1 || inputHour > 12 || minute > 59) return null;
    let hour = inputHour % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + minute;
  }
  match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }
  return null;
};
const timeLabel = (start, end) => start && end ? `${start} – ${end}` : start || end || "Time TBA";
const people = (items) => {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.map((item) => ({ id: idOf(item), name: clean(item?.fullName) })).filter((person) => {
    if (!person.id || !person.name || seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  }).map((person) => person.name);
};

const slug = (value, maxLength = 50) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Za-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, maxLength)
  .replace(/-+$/g, "") || "Agenda";

export function buildPdfFileName({ recipientName = "", mode = "saved" } = {}) {
  const conference = slug(AGENDA_PDF_CONFIG.conferenceCode || AGENDA_PDF_CONFIG.conferenceName, 35);
  if (mode === "full") {
    const configured = process.env.AGENDA_FULL_PDF_FILENAME || `${conference}-Full-Agenda.pdf`;
    const filename = String(configured).replace(/[\\/]/g, "").trim();
    return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  }
  return `${conference}-Saved-Agenda-${slug(recipientName, 40)}.pdf`;
}


export function groupTopicsForPdf(rawTopics = []) {
  const sessions = new Map();
  for (const topic of rawTopics) {
    const session = topic?.sessionId;
    const sessionId = idOf(session);
    const date = toDate(session?.sessionDate);
    const dateKey = date ? toDateKey(date) : null;
    if (!sessionId || !dateKey || !topic?._id) continue;

    let group = sessions.get(sessionId);
    if (!group) {
      const start = clean(session.startTime);
      const end = clean(session.endTime);
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      group = {
        id: sessionId,
        name: clean(session.sessionName) || "Session",
        date: date,
        dateKey,
        dateLabel: dateLabelFormatter.format(date),
        startTime: start,
        endTime: end,
        startMinutes,
        crossesMidnight: startMinutes != null && endMinutes != null && endMinutes < startMinutes,
        hall: clean(session.hallId?.hallName),
        track: clean(session.trackId?.trackName),
        chairpersons: people(session.chairperson),
        topics: [],
        topicIds: new Set(),
      };
      sessions.set(sessionId, group);
    }

    const topicId = idOf(topic);
    if (!topicId || group.topicIds.has(topicId)) continue;
    group.topicIds.add(topicId);
    const topicStart = timeToMinutes(topic.startTime);
    const dayOffset = group.crossesMidnight && topicStart != null && group.startMinutes != null && topicStart < group.startMinutes ? 1 : 0;
    group.topics.push({
      id: topicId,
      name: clean(topic.topicName) || "Untitled topic",
      type: clean(topic.topicType),
      startTime: clean(topic.startTime),
      endTime: clean(topic.endTime),
      sortKey: topicStart == null ? Number.MAX_SAFE_INTEGER : dayOffset * DAY_MINUTES + topicStart,
      roles: [
        { label: "Faculty", names: people(topic.facultyId) },
        { label: "Moderator", names: people(topic.moderatorId) },
        { label: "Panelist", names: people(topic.panelistId) },
        { label: "Expert Panelist", names: people(topic.expertPanelistId) },
      ].filter((role) => role.names.length),
    });
  }

  const ordered = [...sessions.values()].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey) ||
    collator.compare(a.hall || "", b.hall || "") ||
    (a.startMinutes ?? Number.MAX_SAFE_INTEGER) - (b.startMinutes ?? Number.MAX_SAFE_INTEGER) ||
    collator.compare(a.name, b.name),
  );
  ordered.forEach((session) => session.topics.sort((a, b) => a.sortKey - b.sortKey || collator.compare(a.name, b.name)));
  return {
    sessions: ordered,
    sessionCount: ordered.length,
    topicCount: ordered.reduce((sum, session) => sum + session.topics.length, 0),
  };
}


export function generateAgendaPdf({ recipientName = "", groups, mode = "saved", generatedAt = new Date() }) {
  return new Promise((resolve, reject) => {
    const config = AGENDA_PDF_CONFIG;
    const regularPath = process.env.AGENDA_PDF_FONT_REGULAR;
    const boldPath = process.env.AGENDA_PDF_FONT_BOLD;
    const customFonts = Boolean(regularPath && boldPath && existsSync(regularPath) && existsSync(boldPath));
    const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN, bottom: FOOTER_HEIGHT, left: MARGIN, right: MARGIN }, bufferPages: true, info: {
      Title: `${config.conferenceName} - ${config.title}`,
      Author: config.conferenceName,
      Subject: mode === "saved" ? `Personal agenda for ${recipientName}` : "Full conference agenda",
    } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      if (customFonts) {
        doc.registerFont("AgendaRegular", regularPath);
        doc.registerFont("AgendaBold", boldPath);
      }
      const REGULAR = customFonts ? "AgendaRegular" : "Helvetica";
      const BOLD = customFonts ? "AgendaBold" : "Helvetica-Bold";
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - MARGIN * 2;
      const bottomLimit = () => doc.page.height - MARGIN - FOOTER_HEIGHT;
      const measure = (text, font, size, width) => {
        doc.font(font).fontSize(size);
        return doc.heightOfString(String(text || ""), { width, lineGap: 2 });
      };
      const draw = (text, x, y, width, font, size, fill, align = "left") => {
        doc.font(font).fontSize(size).fillColor(fill).text(String(text || ""), x, y, { width, lineGap: 2, align });
      };
      const newPage = () => { doc.addPage(); return MARGIN; };
      const topicHeight = (topic, width) => {
        const pad = 8;
        const inner = width - pad * 2;
        const meta = [timeLabel(topic.startTime, topic.endTime), topic.type].filter(Boolean).join("  |  ");
        const titleHeight = measure(topic.name, BOLD, 11.5, inner);
        const metaHeight = measure(meta, REGULAR, 8.5, inner);
        const roleHeights = topic.roles.map((role) => measure(`${role.label}: ${role.names.join(", ")}`, REGULAR, 9, inner));
        return { width, inner, pad, meta, metaHeight, titleHeight, roleHeights, height: pad * 2 + metaHeight + 4 + titleHeight + roleHeights.reduce((a, b) => a + b + 3, 0) };
      };
      const drawTopic = (topic, layout, y) => {
        const x = MARGIN + 14;
        const width = layout.width;
        doc.roundedRect(x, y, width, layout.height, 5).lineWidth(0.7).strokeColor("#D8E0E8").stroke();
        let cursor = y + layout.pad;
        const tx = x + layout.pad;
        draw(layout.meta, tx, cursor, layout.inner, REGULAR, 8.5, "#637282");
        cursor += layout.metaHeight + 4;
        draw(topic.name, tx, cursor, layout.inner, BOLD, 11.5, "#202B38");
        cursor += layout.titleHeight + 2;
        topic.roles.forEach((role, index) => {
          const text = `${role.label}: ${role.names.join(", ")}`;
          draw(text, tx, cursor, layout.inner, REGULAR, 9, config.primary);
          cursor += layout.roleHeights[index] + 3;
        });
      };


      if (config.showCover) {
        doc.rect(0, 0, pageWidth, 190).fill(config.primary);
        if (config.logoPath && existsSync(config.logoPath)) {
          try { doc.image(config.logoPath, MARGIN, 24, { fit: [110, 80] }); } catch { /* optional logo is skipped if unreadable */ }
        }
        const textY = config.logoPath && existsSync(config.logoPath) ? 110 : 48;
        draw(config.conferenceName, MARGIN, textY, contentWidth, BOLD, 23, "#FFFFFF");
        if (config.dates) draw(config.dates, MARGIN, textY + 38, contentWidth, REGULAR, 11, "#FFFFFF");
        const venueText = [config.venue, config.location].filter(Boolean).join(" · ");
        if (venueText) draw(venueText, MARGIN, textY + 58, contentWidth, REGULAR, 10, "#FFFFFF");
        doc.moveTo(MARGIN, 202).lineTo(pageWidth - MARGIN, 202).lineWidth(3).strokeColor(config.accent).stroke();
        const heading = mode === "saved" ? `Personal Agenda — ${recipientName}` : config.title;
        draw(heading, MARGIN, 232, contentWidth, BOLD, 20, config.primary);
        if (config.subtitle) draw(config.subtitle, MARGIN, 263, contentWidth, REGULAR, 10, "#5B6770");
        const stats = `${groups.topicCount} ${groups.topicCount === 1 ? "topic" : "topics"} · ${groups.sessionCount} ${groups.sessionCount === 1 ? "session" : "sessions"}`;
        draw(stats, MARGIN, 290, contentWidth, REGULAR, 10, "#5B6770");
        draw(`Prepared ${generatedFormatter.format(generatedAt)} (${TIME_ZONE})`, MARGIN, 312, contentWidth, REGULAR, 9, "#6B7280");
        if (config.website) draw(config.website, MARGIN, 332, contentWidth, REGULAR, 9, config.primary);
        doc.addPage();
      } else {
        draw(mode === "saved" ? `Personal Agenda — ${recipientName}` : config.title, MARGIN, MARGIN, contentWidth, BOLD, 17, config.primary);
        doc.moveTo(MARGIN, MARGIN + 28).lineTo(pageWidth - MARGIN, MARGIN + 28).lineWidth(2).strokeColor(config.accent).stroke();
      }


      let y = config.showCover ? MARGIN : MARGIN + 44;
      let currentDateKey = null;
      for (const session of groups.sessions) {
        if (session.dateKey !== currentDateKey) {
          const dayHeight = 26;
          if (y + dayHeight > bottomLimit()) y = newPage();
          doc.roundedRect(MARGIN, y, contentWidth, dayHeight, 5).fill(config.primary);
          draw(session.dateLabel, MARGIN + 10, y + 7, contentWidth - 20, BOLD, 10, "#FFFFFF");
          y += dayHeight + 9;
          currentDateKey = session.dateKey;
        }

        const details = [session.hall && `Hall: ${session.hall}`, session.track && `Track: ${session.track}`].filter(Boolean).join("  ·  ");
        const sessionTitle = session.name;
        const sessionMeta = [session.startTime && session.endTime ? `${session.startTime} – ${session.endTime}` : timeLabel(session.startTime, session.endTime), details].filter(Boolean);
        const chairText = session.chairpersons.length ? `Chairperson${session.chairpersons.length > 1 ? "s" : ""}: ${session.chairpersons.join(", ")}` : "";
        const sessionHeaderHeight = 10 + measure(sessionTitle, BOLD, 12, contentWidth - 24) + sessionMeta.reduce((sum, text) => sum + measure(text, REGULAR, 8.5, contentWidth - 24) + 3, 0) + (chairText ? measure(chairText, REGULAR, 8.5, contentWidth - 24) + 3 : 0);
        const layouts = session.topics.map((topic) => topicHeight(topic, contentWidth - 14));
        if (y + sessionHeaderHeight + 8 + (layouts[0]?.height || 0) > bottomLimit()) y = newPage();
        doc.roundedRect(MARGIN, y, contentWidth, sessionHeaderHeight, 5).fill(config.secondary);
        doc.rect(MARGIN, y, 4, sessionHeaderHeight).fill(config.primary);
        let cursor = y + 7;
        draw(sessionTitle, MARGIN + 12, cursor, contentWidth - 24, BOLD, 12, config.primary);
        cursor += measure(sessionTitle, BOLD, 12, contentWidth - 24) + 3;
        sessionMeta.forEach((text) => {
          draw(text, MARGIN + 12, cursor, contentWidth - 24, REGULAR, 8.5, "#5B6770");
          cursor += measure(text, REGULAR, 8.5, contentWidth - 24) + 3;
        });
        if (chairText) draw(chairText, MARGIN + 12, cursor, contentWidth - 24, REGULAR, 8.5, "#293746");
        y += sessionHeaderHeight + 8;

        session.topics.forEach((topic, index) => {
          const layout = layouts[index];
          if (y + layout.height > bottomLimit()) {
            y = newPage();
            draw(`${session.name} (continued)`, MARGIN, y, contentWidth, BOLD, 9.5, "#5B6770");
            y += 20;
          }
          drawTopic(topic, layout, y);
          y += layout.height + 6;
        });
        y += 10;
      }


      const pages = doc.bufferedPageRange();
      for (let index = 0; index < pages.count; index += 1) {
        doc.switchToPage(pages.start + index);
        const footerY = doc.page.height - 25;
        doc.moveTo(MARGIN, footerY - 6).lineTo(pageWidth - MARGIN, footerY - 6).lineWidth(0.5).strokeColor("#D8E0E8").stroke();
        const footer = config.footer || config.conferenceName;
        draw(footer, MARGIN, footerY, contentWidth * 0.75, REGULAR, 7.5, "#637282");
        draw(`Page ${index + 1} of ${pages.count}`, MARGIN, footerY, contentWidth, REGULAR, 7.5, "#637282", "right");
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
