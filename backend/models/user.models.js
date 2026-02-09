import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false // password never sent in queries
    },

    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      required: true
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
