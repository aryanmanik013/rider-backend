// utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: options.resource_type || 'auto',
          folder: options.folder || 'rider-app',
          public_id: options.public_id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transformation: options.transformation || undefined,
          quality: options.quality || 'auto',
          format: options.format || undefined,
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: options.resource_type || 'image',
      ...options
    });
    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw new Error(`Deletion failed: ${error.message}`);
  }
};

// Generate thumbnail from video
export const generateThumbnail = async (videoUrl, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      folder: options.folder || 'rider-app/thumbnails',
      public_id: options.public_id || `thumb_${Date.now()}`,
      transformation: [
        { width: options.width || 720, height: options.height || 1280, crop: 'fill', gravity: 'center' },
        { start_offset: options.start_offset || '1', duration: options.duration || '1' },
        { format: 'jpg', quality: 'auto' }
      ],
      ...options
    });
    return result;
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  }
};

// Get video duration
export const getVideoDuration = async (videoUrl) => {
  try {
    const result = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      eager: [],
      eager_async: true
    });
    return result.duration;
  } catch (error) {
    console.error("Duration extraction error:", error);
    return 30; // Default duration
  }
};

export default cloudinary;