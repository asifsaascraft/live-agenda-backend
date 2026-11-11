
import mongoose from "mongoose";

const HallSchema = new mongoose.Schema(
  {
    hallName: {
      type: String,
      required: [true, "Hall Name is required."],
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

const Hall =
  mongoose.models.Hall ||
  mongoose.model("Hall", HallSchema);

export default Hall;
