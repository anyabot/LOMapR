import { S3Client } from '@aws-sdk/client-s3';

export function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? '';

// Public bucket URL (r2.dev subdomain or custom domain, no trailing slash).
// Set R2_PUBLIC_URL in env; reads are plain fetch() against this base.
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
