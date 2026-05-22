import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Helper to get R2 configuration from environment variables
const getR2Config = () => {
  return {
    endpoint: process.env.EXPO_PUBLIC_R2_ENDPOINT_URL, // e.g. https://<account_id>.r2.cloudflarestorage.com
    accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.EXPO_PUBLIC_R2_BUCKET_NAME,
    publicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL, // e.g. https://pub-xxx.r2.dev or custom cdn domain
  };
};

let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const config = getR2Config();
  if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    console.warn("Cloudflare R2 is not fully configured in environment variables.");
    return null;
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return s3Client;
};

// High-performance pure-JS base64 decoder that works flawlessly in React Native Hermes/JSC
const base64ToUint8Array = (base64: string): Uint8Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let cleanBase64 = base64;
  if (base64.includes(';base64,')) {
    cleanBase64 = base64.split(';base64,')[1];
  }
  // Remove whitespace and padding characters
  cleanBase64 = cleanBase64.replace(/[\s=]/g, '');
  
  const len = cleanBase64.length;
  const bufferLength = Math.floor(len * 0.75);
  const bytes = new Uint8Array(bufferLength);
  
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[cleanBase64.charCodeAt(i)] ?? 0;
    const encoded2 = lookup[cleanBase64.charCodeAt(i + 1)] ?? 0;
    const encoded3 = lookup[cleanBase64.charCodeAt(i + 2)] ?? 0;
    const encoded4 = lookup[cleanBase64.charCodeAt(i + 3)] ?? 0;
    
    const bytes1 = (encoded1 << 2) | (encoded2 >> 4);
    const bytes2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const bytes3 = ((encoded3 & 3) << 6) | encoded4;
    
    bytes[p++] = bytes1;
    if (i + 2 < len) bytes[p++] = bytes2;
    if (i + 3 < len) bytes[p++] = bytes3;
  }
  
  return bytes.subarray(0, p);
};

export const R2Service = {
  /**
   * Uploads any file from a base64 string to Cloudflare R2
   * @param base64Data Base64 representation of the file
   * @param extension File extension (e.g. 'pdf', 'jpg', 'png')
   * @param folder The folder path in the bucket ('radiology' | 'lab')
   * @param mimeType The file mime type (e.g. 'application/pdf', 'image/jpeg')
   * @returns The public URL of the uploaded file
   */
  uploadFile: async (
    base64Data: string, 
    extension: string, 
    folder: 'radiology' | 'lab', 
    mimeType: string = 'image/jpeg'
  ): Promise<string | null> => {
    const s3 = getS3Client();
    const config = getR2Config();

    if (!s3 || !config.bucketName || !config.publicUrl) {
      throw new Error("Cloudflare R2 credentials or configuration is missing in .env");
    }

    try {
      // 1. Convert base64 string directly to Uint8Array binary data
      const binaryData = base64ToUint8Array(base64Data);

      // 2. Generate a unique key for the file in the bucket
      const randomId = Math.random().toString(36).substring(2, 11);
      const fileKey = `${folder}/${Date.now()}-${randomId}.${extension.toLowerCase()}`;

      // 3. Upload binary file using S3 PutObjectCommand
      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: fileKey,
          Body: binaryData,
          ContentType: mimeType,
        })
      );

      // 4. Return the public URL to be stored in the database
      const cleanPublicUrlBase = config.publicUrl.endsWith('/')
        ? config.publicUrl.slice(0, -1)
        : config.publicUrl;

      return `${cleanPublicUrlBase}/${fileKey}`;
    } catch (error) {
      console.error(`Failed to upload file to Cloudflare R2 under folder ${folder}:`, error);
      throw error;
    }
  },

  /**
   * Wrapper for uploadImage to ensure backward compatibility.
   */
  uploadImage: async (base64Data: string, type: string): Promise<string | null> => {
    const ext = type.toLowerCase() === 'ct' ? 'jpg' : type.toLowerCase();
    return R2Service.uploadFile(base64Data, ext, 'radiology', 'image/jpeg');
  }
};
