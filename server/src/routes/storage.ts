import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';

const presignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().positive().max(10 * 1024 * 1024) // 10MB max
});

export async function storageRoutes(app: FastifyInstance) {
  const auth = (app as any).authenticate;

  app.post('/v1/storage/presign', { preValidation: [auth] }, async (req: any, reply) => {
    const parsed = presignRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.issues });
    }

    const userId = req.user.sub;
    const { filename, contentType } = parsed.data;

    if (!contentType.startsWith('image/')) {
      return reply.code(400).send({ code: 'INVALID_CONTENT_TYPE', message: 'Only images are allowed' });
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const key = `users/${userId}/${fileId}-${filename}`;
    const mockUrl = `https://storage.example.com/${key}`;

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      req.log.warn('R2 credentials not configured, returning mock URL');
      return reply.send({
        uploadUrl: mockUrl,
        publicUrl: mockUrl,
        key,
        expiresIn: 3600,
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        }
      });
    }

    try {
      const endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
      const expiresIn = 3600;
      const uploadUrl = generatePresignedUrl({
        endpoint,
        bucket: r2BucketName,
        key,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        expiresIn
      });

      return reply.send({
        uploadUrl,
        publicUrl: `https://pub-${r2AccountId}.r2.dev/${key}`,
        key,
        expiresIn,
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        }
      });
    } catch (err: any) {
      req.log.error({ err }, 'storage:presign:error');
      return reply.code(500).send({ code: 'PRESIGN_ERROR', message: err.message });
    }
  });

  app.delete('/v1/storage/:key', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ key: z.string() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_KEY' });

    const userId = req.user.sub;
    const key = params.data.key;

    if (!key.startsWith(`users/${userId}/`)) {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'Cannot delete files from other users' });
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    if (!r2AccountId) {
      req.log.warn('R2 credentials not configured, returning mock success');
      return reply.send({ ok: true, key });
    }

    return reply.send({ ok: true, key });
  });
}

interface PresignedUrlParams {
  endpoint: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number;
}

function generatePresignedUrl(params: PresignedUrlParams): string {
  const { endpoint, bucket, key, accessKeyId, secretAccessKey, expiresIn } = params;
  
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  const region = 'auto';
  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQueryString = [
    `X-Amz-Algorithm=${algorithm}`,
    `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${credentialScope}`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`
  ].join('&');
  
  const canonicalHeaders = `host:${new URL(endpoint).host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  return `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}
