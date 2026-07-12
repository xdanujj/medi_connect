import { createRequire } from "module";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const require = createRequire(import.meta.url);

// firebase-admin v14 — flat named exports
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging }                  = require("firebase-admin/messaging");

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let messaging;

const initializeFirebase = () => {
  // Skip if already initialised
  if (getApps().length > 0) {
    messaging = getMessaging();
    return;
  }

  try {
    const rawAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawAccount) {
      console.warn("⚠️  Firebase: FIREBASE_SERVICE_ACCOUNT not set. FCM notifications will be skipped.");
      return;
    }

    let serviceAccount;
    if (rawAccount.trim().startsWith("{")) {
      serviceAccount = JSON.parse(rawAccount);
    } else {
      // Resolve relative to this util file first, then fall back to CWD
      let filePath = path.resolve(__dirname, rawAccount);
      if (!fs.existsSync(filePath)) filePath = path.resolve(rawAccount);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Firebase: service account file not found at ${filePath}. FCM notifications will be skipped.`);
        return;
      }
      serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    if (!serviceAccount?.project_id || serviceAccount.project_id === "your-project-id") {
      console.warn("⚠️  Firebase: invalid service account. FCM notifications will be skipped.");
      return;
    }

    initializeApp({ credential: cert(serviceAccount) });
    messaging = getMessaging();
    console.log("✅ Firebase Admin initialized successfully.");
  } catch (err) {
    console.warn("⚠️  Firebase init failed:", err.message);
  }
};

initializeFirebase();

/**
 * Send an FCM push notification to a specific device token.
 * Silently skips if Firebase is not configured or no token is provided.
 */
export const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!messaging || !token) {
    console.warn("FCM: Skipped — messaging not initialized or no token provided.");
    return null;
  }

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      token,
    };

    const response = await messaging.send(message);
    console.log("FCM notification sent:", response);
    return response;
  } catch (err) {
    console.error("FCM send error:", err.message);
    return null;
  }
};
