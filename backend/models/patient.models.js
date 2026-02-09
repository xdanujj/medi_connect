import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const patientSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    age: Number,

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    refreshToken: {
      type: String,
    },

    profilePhoto: String,
  },
  { timestamps: true },
);

export const Patient = mongoose.model("Patient", patientSchema);
