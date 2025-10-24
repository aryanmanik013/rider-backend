// models/Media.js
import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
  // File information
  filename: {
    type: String,
    required: true
  },
  
  originalName: {
    type: String,
    required: true
  },
  
  // Cloudinary information
  cloudinaryId: {
    type: String,
    required: true,
    unique: true
  },
  
  url: {
    type: String,
    required: true
  },
  
  secureUrl: {
    type: String,
    required: true
  },
  
  // File metadata
  fileType: {
    type: String,
    enum: ['image', 'video', 'document'],
    required: true
  },
  
  mimeType: {
    type: String,
    required: true
  },
  
  size: {
    type: Number,
    required: true
  },
  
  width: {
    type: Number,
    required: false
  },
  
  height: {
    type: Number,
    required: false
  },
  
  duration: {
    type: Number,
    required: false // for videos
  },
  
  // Media categorization
  category: {
    type: String,
    enum: [
      'profile_picture',
      'post_image',
      'post_video',
      'trip_image',
      'trip_video',
      'bike_image',
      'document',
      'other'
    ],
    default: 'other'
  },
  
  // Ownership and permissions
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Privacy settings
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Related entities
  relatedTo: {
    type: {
      type: String,
      enum: ['post', 'trip', 'user', 'tracking_session']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Tags for searchability
  tags: [String],
  
  // Description
  description: {
    type: String,
    maxlength: 500
  },
  
  // Location data (if applicable)
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  
  // Error information
  errorMessage: {
    type: String
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  downloads: {
    type: Number,
    default: 0
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  }

}, {
  timestamps: true
});

// Indexes for better performance
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ category: 1, fileType: 1 });
mediaSchema.index({ cloudinaryId: 1 });
mediaSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isDeleted: 1 });

// Pre-save middleware
mediaSchema.pre('save', function(next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Instance methods
mediaSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

mediaSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

mediaSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

mediaSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static methods
mediaSchema.statics.findByUser = function(userId, options = {}) {
  const query = { uploadedBy: userId, isDeleted: false };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.fileType) {
    query.fileType = options.fileType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

mediaSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, isDeleted: false };
  
  if (options.fileType) {
    query.fileType = options.fileType;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

mediaSchema.statics.getUserMediaStats = function(userId) {
  return this.aggregate([
    { $match: { uploadedBy: userId, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        totalViews: { $sum: '$views' },
        totalDownloads: { $sum: '$downloads' },
        byCategory: {
          $push: {
            category: '$category',
            fileType: '$fileType',
            size: '$size'
          }
        }
      }
    }
  ]);
};

const Media = mongoose.model('Media', mediaSchema);
export default Media;
