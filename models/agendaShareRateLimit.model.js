import mongoose from "mongoose";


const agendaShareRateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    requestType: { type: String, enum: ["saved", "full"], required: true },
    dimension: { type: String, enum: ["phone", "ip"], required: true },
    windowId: { type: Number, required: true },
    count: { type: Number, default: 0, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);


agendaShareRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


const AgendaShareRateLimit = mongoose.models.AgendaShareRateLimit ||
  mongoose.model("AgendaShareRateLimit", agendaShareRateLimitSchema);


export default AgendaShareRateLimit;
