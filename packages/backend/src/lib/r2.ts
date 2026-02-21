import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToR2(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  prefix = "",
): Promise<string> {
  const ext = path.extname(originalname);
  const key = `${prefix}${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from Cloudflare R2 given its public URL.
 */
export async function deleteFromR2(url: string): Promise<void> {
  const publicUrl = process.env.R2_PUBLIC_URL!;
  if (!url.startsWith(publicUrl)) return; // Not an R2 URL, skip
  const key = url.slice(publicUrl.length + 1); // Remove "https://.../"
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }),
  );
}
