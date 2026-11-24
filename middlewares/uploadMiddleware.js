
import multer from "multer";
import multerS3 from "multer-s3";
import { randomUUID } from "crypto";
import path from "path";
import s3 from "../config/s3.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const AGENDA_UPLOAD_FOLDERS = {
  SAVED: "agenda/saved-agendas",
  FULL: "agenda/full-agenda",
};

/**
 * PDF-only file filter
 */
const pdfFileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === "application/pdf" && extension === ".pdf") {
    return cb(null, true);
  }

  return cb(new Error("Only PDF files are allowed."), false);
};

/**
 * Creates an S3 PDF uploader.
 *
 * @param {Function} keyGenerator - Generates the S3 object key.
 */
const createAgendaPDFUploader = (keyGenerator) => {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: "public-read",
      contentType: "application/pdf",
      contentDisposition: "inline",

      key: (req, file, cb) => {
        try {
          const key = keyGenerator(req, file);
          cb(null, key);
        } catch (error) {
          cb(error);
        }
      },
    }),

    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },

    fileFilter: pdfFileFilter,
  });
};

/**
 * My Saved Agenda PDF
 *
 * Folder: agenda/saved-agendas/
 * Every upload gets a unique S3 object key.
 */
export const uploadSavedAgendaPDF = createAgendaPDFUploader(
  () =>
    `${AGENDA_UPLOAD_FOLDERS.SAVED}/${Date.now()}-${randomUUID()}.pdf`
);

/**
 * Full Agenda PDF
 *
 * Folder: agenda/full-agenda/
 * Uses a fixed S3 object key so every upload replaces
 * the previously uploaded Full Agenda PDF.
 */
export const uploadFullAgendaPDF = createAgendaPDFUploader(
  () => {
    const configuredFilename =
      process.env.AGENDA_FULL_PDF_FILENAME || "full-agenda.pdf";

    const filename = path.basename(configuredFilename);

    if (path.extname(filename).toLowerCase() !== ".pdf") {
      throw new Error("AGENDA_FULL_PDF_FILENAME must be a PDF filename.");
    }

    return `${AGENDA_UPLOAD_FOLDERS.FULL}/${filename}`;
  }
);
