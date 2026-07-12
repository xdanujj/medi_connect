import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.S3_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Uploads a local file to Amazon S3 bucket.
 * Cleans up the local file after upload is complete or failed.
 * 
 * @param {string} localFilePath - Path of the local file
 * @param {string} contentType - Content/MIME type of the file (e.g. application/pdf)
 * @returns {Promise<string>} - Public S3 URL of the uploaded file
 */
export const uploadFileToS3 = async (localFilePath, contentType = "application/pdf") => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      throw new Error(`Local file not found: ${localFilePath}`);
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || bucketName === "your_s3_bucket_name_here") {
      throw new Error("S3_BUCKET_NAME is not configured");
    }

    const fileStream = fs.createReadStream(localFilePath);
    const fileKey = `prescriptions/${path.basename(localFilePath)}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileStream,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct the public S3 URL
    const s3Url = `https://${bucketName}.s3.${process.env.S3_REGION || "ap-south-1"}.amazonaws.com/${fileKey}`;

    // Clean up local temp file
    fs.unlinkSync(localFilePath);

    return s3Url;
  } catch (error) {
    console.error("❌ Amazon S3 upload failed:", error);
    // Clean up local temp file on error
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw error;
  }
};
