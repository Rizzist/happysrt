import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const b2 = new S3Client({
  region: process.env.B2_S3_REGION || "us-east-005",
  endpoint: requireEnv("B2_S3_ENDPOINT"),
  credentials: {
    accessKeyId: requireEnv("B2_KEY_ID"),
    secretAccessKey: requireEnv("B2_APPLICATION_KEY"),
  },
  forcePathStyle: true,
});

export function sanitizeFilename(name) {
  const s = String(name || "file").replace(/[/\\]/g, "_").trim();
  return s || "file";
}

export async function b2PutFile({ bucket, key, filepath, contentType }) {
  const body = fs.createReadStream(filepath);

  await b2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return { key };
}

export async function b2DeleteKey({ bucket, key }) {
  await b2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
