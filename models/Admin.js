
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AdminSchema = new mongoose.Schema(
  {
    // ==========================================
    // SINGLE ADMIN DOCUMENT
    // ==========================================

    _id: {
      type: String,
      default: "primary-admin",
      immutable: true,
    },

    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    name: {
      type: String,
      required: [true, "Admin name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Admin email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Admin password is required."],
      minlength: 8,
      maxlength: 128,
      select: false,
    },

    // ==========================================
    // REFRESH TOKEN
    // ==========================================

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ==========================================
// HASH PASSWORD BEFORE SAVE
// ==========================================

AdminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// ==========================================
// MATCH PASSWORD METHOD
// ==========================================

AdminSchema.methods.matchPassword = async function (
  enteredPassword
) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ==========================================
// ADMIN MODEL
// ==========================================

const Admin =
  mongoose.models.Admin ||
  mongoose.model("Admin", AdminSchema);

export default Admin;
