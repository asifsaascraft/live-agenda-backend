import mongoose from "mongoose";


const agendaShareSchema = new mongoose.Schema(
  {
    requestType: { type: String, enum: ["MY_SAVED_AGENDA", "FULL_AGENDA"], required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, required: true, trim: true, index: true },
    topicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
    topicCount: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 },
    status: { type: String, enum: ["PROCESSING", "COMPLETED", "FAILED"], default: "PROCESSING", index: true },
    pdfStatus: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING" },
    storageStatus: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING" },
    whatsappStatus: { type: String, enum: ["PENDING", "ACCEPTED", "FAILED"], default: "PENDING" },
    pdfFilename: { type: String, default: null },
    pdfUrl: { type: String, default: null },
    s3Key: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    providerMessageId: { type: String, default: null },
    failureStage: { type: String, default: null },
    failureReason: { type: String, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true },
);


agendaShareSchema.index({ mobile: 1, createdAt: -1 });
agendaShareSchema.index({ requestType: 1, createdAt: -1 });


const AgendaShare = mongoose.models.AgendaShare || mongoose.model("AgendaShare", agendaShareSchema);
export default AgendaShare;
