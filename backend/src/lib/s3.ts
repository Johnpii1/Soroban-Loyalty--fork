import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  // In a real S3-compatible setup, you might need endpoint, accessKeyId, secretAccessKey
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "soroban-loyalty-assets";
const CDN_BASE_URL = process.env.CDN_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

export async function uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
  const extension = mimeType.split("/")[1] || "jpg";
  const key = `campaigns/${uuidv4()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read", // Assuming public bucket or CDN access
    })
  );

  return `${CDN_BASE_URL}/${key}`;
}
