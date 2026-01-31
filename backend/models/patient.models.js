import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const patientSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["PATIENT"],
      default: "PATIENT",
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
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


patientSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export const Patient = mongoose.model("Patient", patientSchema);
