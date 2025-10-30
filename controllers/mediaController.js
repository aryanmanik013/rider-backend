// controllers/mediaController.js
import Media from "../models/Media.js";
import User from "../models/User.js";
import { uploadToR2, deleteFromR2, getPublicUrl } from "../utils/r2.js";
import multer from "multer";
import path from "path";

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB hard cap; additional per-type checks below
  },
  fileFilter: (req, file, cb) => {
    // Check file type (images and documents only — videos go via reels API)
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
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
      // Prevent duplicate video upload paths; direct users to reels endpoint
      return res.status(400).json({ message: "Use /api/v1/reels for video uploads (max 10MB)" });
    }

    // Enforce per-type size limits: images ≤ 5MB, videos ≤ 10MB
    const maxImageBytes = 5 * 1024 * 1024;
    const maxVideoBytes = 10 * 1024 * 1024; // kept for guard if a video slips through
    if (fileType === 'image' && req.file.size > maxImageBytes) {
      return res.status(413).json({ message: "Image too large (max 5MB)" });
    }
    if (fileType === 'video' && req.file.size > maxVideoBytes) {
      return res.status(413).json({ message: "Video too large (max 10MB)" });
    }

    // Build R2 object key
    const timestamp = Date.now();
    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'jpg';
    const key = `media/${fileType}s/${userId}/${timestamp}.${fileExt}`;

    // Upload to Cloudflare R2
    await uploadToR2(req.file.buffer, key, req.file.mimetype);
    const publicUrl = getPublicUrl(key);

    // Create media record
    const media = new Media({
      filename: key,
      originalName: req.file.originalname,
      cloudinaryId: key, // repurpose field to store R2 object key
      url: publicUrl,
      secureUrl: publicUrl,
      fileType: fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      // width/height/duration are unknown without extra processing; omit
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

    // Delete from R2
    try {
      await deleteFromR2(media.cloudinaryId);
    } catch (r2Error) {
      console.error("R2 deletion error:", r2Error);
      // Continue with database deletion even if R2 fails
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
