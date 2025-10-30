// utils/r2.js
import AWS from "aws-sdk";

// Configure R2 Client (R2 is S3-compatible) - lazy initialization
const getR2Endpoint = () => {
  let endpoint = null;
  
  if (process.env.R2_ENDPOINT) {
    endpoint = process.env.R2_ENDPOINT.trim();
    // Parse and clean the endpoint
    // Expected format: https://account-id.r2.cloudflarestorage.com
    // Remove bucket name if accidentally included: /bucket-name
    try {
      const url = new URL(endpoint);
      // Return just the origin (protocol + host), no path
      endpoint = `${url.protocol}//${url.host}`;
    } catch (e) {
      // If not a valid URL, clean manually
      endpoint = endpoint.replace(/\/[^\/]+$/, ''); // Remove last path segment
      endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    }
  } else if (process.env.R2_ACCOUNT_ID) {
    endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  } else {
    throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID must be configured");
  }
  
  return endpoint;
};

// Lazy getter for S3 client (initializes only when needed)
let s3Client = null;
const getS3 = () => {
  if (!s3Client) {
    const endpoint = getR2Endpoint();
    
    // Debug: Log endpoint (remove in production)
    console.log('R2 Endpoint:', endpoint);
    
    // R2 requires forcePathStyle and specific configuration
    s3Client = new AWS.S3({
      endpoint: endpoint,
      accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
      signatureVersion: 'v4',
      region: 'auto',
      s3ForcePathStyle: true, // Required for R2 - uses path-style URLs
      s3DisableBodySigning: false,
      // Use endpoint URL's hostname for signing
      useAccelerateEndpoint: false
    });
  }
  return s3Client;
};

const getBucketName = () => {
  return process.env.R2_BUCKET_NAME || "rider-bucket";
};

/**
 * Upload file to R2 bucket
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name with path
 * @param {string} contentType - MIME type (e.g., 'video/mp4', 'image/jpeg')
 * @returns {Promise<Object>} Upload result with URL
 */
export const uploadToR2 = async (fileBuffer, fileName, contentType) => {
  try {
    const s3 = getS3();
    const params = {
      Bucket: getBucketName(),
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    };

    await s3.putObject(params).promise();

    // Generate public URL (if bucket is public) or presigned URL
    const publicUrl = getPublicUrl(fileName);
    
    return {
      key: fileName,
      url: publicUrl,
      publicUrl: publicUrl,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
};

/**
 * Generate public URL for R2 object
 * Works if bucket is configured as public, otherwise returns presigned URL
 * @param {string} fileName - File key/path in bucket
 * @returns {string} Public URL
 */
export const getPublicUrl = (fileName) => {
  // Remove leading slash if present
  const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;

  // Prefer explicit base URL from env (full URL), e.g. https://pub-xxxx.r2.dev
  const baseFromEnv = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_DOMAIN;
  if (baseFromEnv && baseFromEnv.trim().length > 0) {
    const base = baseFromEnv.trim().replace(/\/$/, "");
    const normalizedBase = /^https?:\/\//i.test(base) ? base : `https://${base}`;
    return `${normalizedBase}/${cleanFileName}`;
  }

  // Fallback: derive from account id (may not match public dev domain)
  const accountId = process.env.R2_PUBLIC_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("R2_PUBLIC_BASE_URL/R2_PUBLIC_DOMAIN or R2_ACCOUNT_ID must be configured for public URLs");
  }
  return `https://pub-${accountId}.r2.dev/${cleanFileName}`;
};

/**
 * Generate presigned URL for temporary access (works with private buckets)
 * @param {string} fileName - File key/path in bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
export const getPresignedUrl = async (fileName, expiresIn = 3600) => {
  try {
    const s3 = getS3();
    const params = {
      Bucket: getBucketName(),
      Key: fileName,
      Expires: expiresIn,
    };

    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error("Presigned URL generation error:", error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Delete file from R2 bucket
 * @param {string} fileName - File key/path in bucket
 * @returns {Promise<boolean>} Success status
 */
export const deleteFromR2 = async (fileName) => {
  try {
    const s3 = getS3();
    const params = {
      Bucket: getBucketName(),
      Key: fileName,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error("R2 deletion error:", error);
    throw new Error(`R2 deletion failed: ${error.message}`);
  }
};

/**
 * Upload video to R2 with optimized settings for reels
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} userId - User ID for folder organization
 * @param {string} originalName - Original file name
 * @returns {Promise<Object>} Upload result
 */
export const uploadReelVideo = async (videoBuffer, userId, originalName) => {
  const timestamp = Date.now();
  const fileExtension = originalName.split('.').pop() || 'mp4';
  const fileName = `reels/videos/${userId}/${timestamp}.${fileExtension}`;
  
  return await uploadToR2(videoBuffer, fileName, `video/${fileExtension === 'mp4' ? 'mp4' : 'quicktime'}`);
};

/**
 * Generate video thumbnail and upload to R2
 * Note: For production, you'd want to extract thumbnail using ffmpeg
 * This is a placeholder - you'll need to implement actual thumbnail generation
 * @param {Buffer} videoBuffer - Video file buffer (or frame buffer if extracted)
 * @param {string} userId - User ID
 * @param {string} videoFileName - Original video file name
 * @returns {Promise<Object>} Thumbnail upload result
 */
export const uploadReelThumbnail = async (videoBuffer, userId, videoFileName) => {
  // TODO: Extract thumbnail frame from video using ffmpeg
  // For now, this is a placeholder that would need actual thumbnail generation
  // You can use libraries like fluent-ffmpeg or @ffmpeg-installer/ffmpeg
  
  const timestamp = Date.now();
  const fileName = `reels/thumbnails/${userId}/${timestamp}.jpg`;
  
  // This would be the actual thumbnail buffer after extraction
  // For now, returning a placeholder path
  return {
    key: fileName,
    url: getPublicUrl(fileName),
    publicUrl: getPublicUrl(fileName),
  };
};

export default getS3;
