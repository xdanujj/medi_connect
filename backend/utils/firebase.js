import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let firebaseApp;
let messaging;

const initializeFirebase = () => {
  if (firebaseApp) return; // Already initialized

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

    if (!serviceAccount.project_id || serviceAccount.project_id === "your-project-id") {
      console.warn("⚠️  Firebase: FIREBASE_SERVICE_ACCOUNT not configured. FCM notifications will be skipped.");
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    messaging = admin.messaging();
    console.log("✅ Firebase Admin initialized successfully.");
  } catch (err) {
    console.warn("⚠️  Firebase init failed (check FIREBASE_SERVICE_ACCOUNT):", err.message);
  }
};

initializeFirebase();

/**
 * Send FCM push notification to a specific device token.
 * Silently skips if Firebase is not configured or token is missing.
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
