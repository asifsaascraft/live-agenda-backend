
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    // ==============================
    // BASIC INFORMATION
    // ==============================

    name: {
      type: String,
      required: [true, "Name is required."],
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

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
      select: false,
    },

    // ==============================
    // ROLE
    // ==============================

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ==============================
    // REFRESH TOKEN
    // ==============================

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    // ==============================
    // FORGOT PASSWORD
    // ==============================

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
  }
);

// ==============================
// HASH PASSWORD BEFORE SAVE
// ==============================

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// ==============================
// MATCH PASSWORD METHOD
// ==============================

UserSchema.methods.matchPassword = async function (
  enteredPassword
) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User =
  mongoose.models.User ||
  mongoose.model("User", UserSchema);

export default User;
