import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import s3 from "../config/s3.js";

const SAVED_PREFIX = "agenda/saved-agendas";
const FULL_PREFIX = "agenda/full-agenda";
const SAVED_RETENTION_DAYS = 30;


export class StorageConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "StorageConfigError";
  }
}


const getBucket = () => {
  const bucket = process.env.AWS_BUCKET_NAME?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!bucket || !region) throw new StorageConfigError("Agenda PDF storage is not configured.");
  return { bucket, region };
};


const getPublicBaseUrl = ({ bucket, region }) => {
  const customBase = process.env.AGENDA_S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (customBase) {
    if (!customBase.startsWith("https://")) throw new StorageConfigError("Agenda public storage URL must use HTTPS.");
    return customBase;
  }
  return region === "us-east-1"
    ? `https://${bucket}.s3.amazonaws.com`
    : `https://${bucket}.s3.${region}.amazonaws.com`;
};

const encodeKey = (key) => key.split("/").map(encodeURIComponent).join("/");
const safeFilename = (filename) => path.basename(String(filename || "agenda.pdf")).replace(/[\r\n"\\]/g, "_");


export async function saveAgendaPdf(buffer, { mode, filename }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Agenda PDF generation returned an empty file.");
  }
  if (mode !== "saved" && mode !== "full") throw new Error("Invalid agenda PDF type.");

  const { bucket, region } = getBucket();
  const publicBaseUrl = getPublicBaseUrl({ bucket, region });
  const pdfFilename = safeFilename(filename);
  const key = mode === "saved"
    ? `${SAVED_PREFIX}/${randomUUID()}.pdf`
    : `${FULL_PREFIX}/${pdfFilename}`;
  const expiresAt = mode === "saved"
    ? new Date(Date.now() + SAVED_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    : null;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
    ContentDisposition: `inline; filename="${pdfFilename}"`,
    CacheControl: mode === "full" ? "no-cache, no-store, must-revalidate" : "public, max-age=86400",
    Metadata: {
      requestType: mode,
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
    },
  }));

  return {
    key,
    filename: pdfFilename,
    publicUrl: `${publicBaseUrl}/${encodeKey(key)}`,
    expiresAt,
  };
}


export const agendaStorageConfig = {
  savedPrefix: SAVED_PREFIX,
  fullPrefix: FULL_PREFIX,
  savedRetentionDays: SAVED_RETENTION_DAYS,
};
