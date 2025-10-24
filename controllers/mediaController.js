// controllers/mediaController.js
import Media from "../models/Media.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Middleware for file upload
export const uploadMiddleware = upload.single('file');

// Upload media file
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user._id;
    const { category = 'other', description, tags, location } = req.body;

    // Determine file type
    let fileType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: fileType === 'video' ? 'video' : 'image',
          folder: `rider-app/${category}`,
          public_id: `${userId}_${Date.now()}`,
          transformation: fileType === 'image' ? [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
          ] : undefined
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Create media record
    const media = new Media({
      filename: result.public_id,
      originalName: req.file.originalname,
      cloudinaryId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      fileType: fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      width: result.width,
      height: result.height,
      duration: result.duration,
      category: category,
      uploadedBy: userId,
      description: description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      location: location ? JSON.parse(location) : undefined,
      processingStatus: 'completed'
    });

    await media.save();

    res.status(201).json({
      message: "File uploaded successfully",
      media: {
        _id: media._id,
        filename: media.filename,
        originalName: media.originalName,
        url: media.secureUrl,
        fileType: media.fileType,
        category: media.category,
        size: media.size,
        width: media.width,
        height: media.height,
        duration: media.duration,
        description: media.description,
        tags: media.tags,
        location: media.location,
        createdAt: media.createdAt
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Upload failed", 
      error: error.message 
    });
  }
};

// Delete media file
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find media
    const media = await Media.findOne({ 
      _id: id, 
      uploadedBy: userId, 
      isDeleted: false 
    });

    if (!media) {
      return res.status(404).json({ message: "Media not found or access denied" });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(media.cloudinaryId, {
        resource_type: media.fileType === 'video' ? 'video' : 'image'
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Soft delete from database
    await media.softDelete();

    res.json({ message: "Media deleted successfully" });

  } catch (error) {
    res.status(500).json({ 
      message: "Delete failed", 
      error: error.message 
    });
  }
};

// Get user's media
export const getUserMedia = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, category, fileType } = req.query;
    const currentUserId = req.user._id;

    // Check if user exists
    const user = await User.findById(userId).select('name avatar');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if requesting own media or public media
    const isOwnMedia = userId === currentUserId.toString();
    const query = { 
      uploadedBy: userId, 
      isDeleted: false 
    };

    // If not own media, only show public media
    if (!isOwnMedia) {
      query.isPublic = true;
    }

    // Apply filters
    if (category) query.category = category;
    if (fileType) query.fileType = fileType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMedia = await Media.countDocuments(query);

    res.json({
      media: media.map(m => ({
        _id: m._id,
        filename: m.filename,
        originalName: m.originalName,
        url: m.secureUrl,
        fileType: m.fileType,
        category: m.category,
        size: m.size,
        width: m.width,
        height: m.height,
        duration: m.duration,
        description: m.description,
        tags: m.tags,
        location: m.location,
        views: m.views,
        downloads: m.downloads,
        createdAt: m.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMedia / parseInt(limit)),
        totalMedia,
        hasMore: skip + media.length < totalMedia
      },
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get media by ID
export const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const media = await Media.findOne({ 
      _id: id, 
      isDeleted: false 
    }).populate('uploadedBy', 'name avatar');

    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Check access permissions
    if (!media.isPublic && media.uploadedBy._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Increment views
    await media.incrementViews();

    res.json({
      media: {
        _id: media._id,
        filename: media.filename,
        originalName: media.originalName,
        url: media.secureUrl,
        fileType: media.fileType,
        category: media.category,
        size: media.size,
        width: media.width,
        height: media.height,
        duration: media.duration,
        description: media.description,
        tags: media.tags,
        location: media.location,
        views: media.views + 1,
        downloads: media.downloads,
        usageCount: media.usageCount,
        createdAt: media.createdAt,
        uploadedBy: {
          _id: media.uploadedBy._id,
          name: media.uploadedBy.name,
          avatar: media.uploadedBy.avatar
        }
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update media metadata
export const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { description, tags, category, isPublic } = req.body;

    const media = await Media.findOne({ 
      _id: id, 
      uploadedBy: userId, 
      isDeleted: false 
    });

    if (!media) {
      return res.status(404).json({ message: "Media not found or access denied" });
    }

    // Update fields
    if (description !== undefined) media.description = description;
    if (tags !== undefined) media.tags = tags.split(',').map(tag => tag.trim());
    if (category !== undefined) media.category = category;
    if (isPublic !== undefined) media.isPublic = isPublic;

    await media.save();

    res.json({
      message: "Media updated successfully",
      media: {
        _id: media._id,
        description: media.description,
        tags: media.tags,
        category: media.category,
        isPublic: media.isPublic
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get media statistics
export const getMediaStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Media.getUserMediaStats(userId);

    if (stats.length === 0) {
      return res.json({
        totalFiles: 0,
        totalSize: 0,
        totalViews: 0,
        totalDownloads: 0,
        byCategory: {},
        byFileType: {}
      });
    }

    const userStats = stats[0];
    
    // Process category breakdown
    const byCategory = {};
    const byFileType = {};
    
    userStats.byCategory.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      byFileType[item.fileType] = (byFileType[item.fileType] || 0) + 1;
    });

    res.json({
      totalFiles: userStats.totalFiles,
      totalSize: userStats.totalSize,
      totalViews: userStats.totalViews,
      totalDownloads: userStats.totalDownloads,
      byCategory,
      byFileType
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Download media (increment download count)
export const downloadMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const media = await Media.findOne({ 
      _id: id, 
      isDeleted: false 
    });

    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Check access permissions
    if (!media.isPublic && media.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Increment download count
    await media.incrementDownloads();

    res.json({
      message: "Download link generated",
      downloadUrl: media.secureUrl,
      filename: media.originalName
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
