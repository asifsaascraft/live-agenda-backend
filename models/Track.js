
import mongoose from "mongoose";

const TrackSchema = new mongoose.Schema(
  {
    trackName: {
      type: String,
      required: [true, "Track Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: [true, "Status is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Track =
  mongoose.models.Track ||
  mongoose.model("Track", TrackSchema);

export default Track;
