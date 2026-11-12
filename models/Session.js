
import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: [true, "Session name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    sessionDate: {
      type: Date, // frontend send indian date and you store in db UTC format
      required: [true, "Session Date is required"],
    },

    startTime: {  // like 10:30 AM
      type: String,
      required: [true, "Start time is required"],
    },
    endTime: {   // like 11:00 AM
      type: String,
      required: [true, "End time is required"],
    },

    chairperson: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: [true, "Chairperson is required"],
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Session =
  mongoose.models.Session ||
  mongoose.model("Session", SessionSchema);

export default Session;
