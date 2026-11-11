
import mongoose from "mongoose";

const FacultySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Faculty Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile is required"],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Faculty =
  mongoose.models.Faculty ||
  mongoose.model("Faculty", FacultySchema);

export default Faculty;
