// controllers/reelsController.js
import Reel from "../models/Reel.js";
import User from "../models/User.js";
import { uploadReelVideo, uploadReelThumbnail, getPublicUrl, deleteFromR2 } from "../utils/r2.js";

// Create a new reel
export const createReel = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      caption = "",
      hashtags = [],
      mentions = [],
      location,
      audio = {},
      rideContext = {},
      visibility = "public"
    } = req.body;

    // Validate video file
    if (!req.file) {
      return res.status(400).json({ message: "Video file is required" });
    }

    // Upload video to R2
    const videoResult = await uploadReelVideo(
      req.file.buffer,
      userId.toString(),
      req.file.originalname
    );

    // Generate thumbnail (placeholder - enhance with ffmpeg later if needed)
    // For now, create a thumbnail path (you can extract actual thumbnail using ffmpeg)
    const thumbnailPath = videoResult.key.replace('/videos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg');
    const thumbnailUrl = getPublicUrl(thumbnailPath);
    
    // TODO: Extract actual thumbnail frame from video using ffmpeg
    // Example: Use fluent-ffmpeg or @ffmpeg-installer/ffmpeg to extract frame at 1 second
    // For now, using placeholder URL structure

    // Process hashtags
    const processedHashtags = hashtags
      .map(tag => tag.replace(/^#/, '').toLowerCase().trim())
      .filter(tag => tag.length > 0);

    // Validate mentions
    const validMentions = [];
    for (const mentionId of mentions) {
      const user = await User.findById(mentionId);
      if (user) {
        validMentions.push(mentionId);
      }
    }

    // Create reel
    const reel = await Reel.create({
      creator: userId,
      video: {
        url: videoResult.url, // Fast R2 public URL
        cloudinaryId: videoResult.key, // Store R2 key instead of cloudinary ID
        duration: 30, // TODO: Extract actual duration from video metadata
        thumbnail: thumbnailUrl,
        aspectRatio: "9:16"
      },
      audio: {
        hasAudio: audio.hasAudio !== false,
        originalAudio: audio.originalAudio !== false,
        musicTrack: audio.musicTrack || null
      },
      caption: caption.trim(),
      hashtags: processedHashtags,
      mentions: validMentions,
      location,
      rideContext,
      visibility
    });

    // Populate creator details
    await reel.populate('creator', 'name avatar username');

    res.status(201).json({
      message: "Reel created successfully",
      reel: {
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        mentions: reel.mentions,
        location: reel.location,
        rideContext: reel.rideContext,
        visibility: reel.visibility,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        views: reel.views,
        createdAt: reel.createdAt
      }
    });

  } catch (error) {
    console.error("Create reel error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reel feed (discovery)
export const getReelFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reels = await Reel.getFeed(userId, { limit: parseInt(limit), skip });

    res.json({
      reels: reels.map(reel => ({
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        location: reel.location,
        rideContext: reel.rideContext,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        views: reel.views,
        trendingScore: reel.trendingScore,
        createdAt: reel.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: reels.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get trending reels
export const getTrendingReels = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reels = await Reel.getTrending({ limit: parseInt(limit), skip });

    res.json({
      reels: reels.map(reel => ({
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        location: reel.location,
        rideContext: reel.rideContext,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        views: reel.views,
        trendingScore: reel.trendingScore,
        createdAt: reel.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: reels.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reel details
export const getReelDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(id)
      .populate('creator', 'name avatar username')
      .populate('likes.user', 'name avatar username')
      .populate('comments.user', 'name avatar username')
      .populate('comments.replies.user', 'name avatar username')
      .populate('mentions', 'name avatar username');

    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    if (reel.status !== 'active') {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Add view for the user
    await reel.addView(userId);

    res.json({
      _id: reel._id,
      creator: {
        _id: reel.creator._id,
        name: reel.creator.name,
        username: reel.creator.username,
        avatar: reel.creator.avatar
      },
      video: reel.video,
      audio: reel.audio,
      caption: reel.caption,
      hashtags: reel.hashtags,
      mentions: reel.mentions,
      location: reel.location,
      rideContext: reel.rideContext,
      visibility: reel.visibility,
      likes: reel.likes.map(like => ({
        user: {
          _id: like.user._id,
          name: like.user.name,
          username: like.user.username,
          avatar: like.user.avatar
        },
        createdAt: like.createdAt
      })),
      comments: reel.comments.map(comment => ({
        _id: comment._id,
        user: {
          _id: comment.user._id,
          name: comment.user.name,
          username: comment.user.username,
          avatar: comment.user.avatar
        },
        content: comment.content,
        likes: comment.likes.length,
        replies: comment.replies.map(reply => ({
          _id: reply._id,
          user: {
            _id: reply.user._id,
            name: reply.user.name,
            username: reply.user.username,
            avatar: reply.user.avatar
          },
          content: reply.content,
          createdAt: reply.createdAt
        })),
        createdAt: comment.createdAt
      })),
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      views: reel.views,
      trendingScore: reel.trendingScore,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Like/Unlike a reel
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const result = reel.toggleLike(userId);
    await reel.save();

    res.json({
      message: result.liked ? "Reel liked" : "Reel unliked",
      liked: result.liked,
      likesCount: result.likesCount
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Save/Unsave a reel
export const toggleSave = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const result = reel.toggleSave(userId);
    await reel.save();

    res.json({
      message: result.saved ? "Reel saved" : "Reel unsaved",
      saved: result.saved,
      savesCount: result.savesCount
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add comment to reel
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: "Comment too long (max 500 characters)" });
    }

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    reel.comments.push({
      user: userId,
      content: content.trim()
    });

    await reel.save();
    await reel.populate('comments.user', 'name avatar username');

    const newComment = reel.comments[reel.comments.length - 1];

    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        _id: newComment._id,
        user: {
          _id: newComment.user._id,
          name: newComment.user.name,
          username: newComment.user.username,
          avatar: newComment.user.avatar
        },
        content: newComment.content,
        createdAt: newComment.createdAt
      },
      commentsCount: reel.commentsCount
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reels by hashtag
export const getReelsByHashtag = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reels = await Reel.getByHashtag(hashtag, { limit: parseInt(limit), skip });

    res.json({
      hashtag: hashtag,
      reels: reels.map(reel => ({
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        location: reel.location,
        rideContext: reel.rideContext,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        views: reel.views,
        createdAt: reel.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: reels.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user's reels
export const getUserReels = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reels = await Reel.find({
      creator: userId,
      status: 'active'
    })
      .populate('creator', 'name avatar username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      reels: reels.map(reel => ({
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        location: reel.location,
        rideContext: reel.rideContext,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        views: reel.views,
        createdAt: reel.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: reels.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete reel (only by creator)
export const deleteReel = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    if (reel.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this reel" });
    }

    // Delete video and thumbnail from R2
    try {
      if (reel.video.cloudinaryId) {
        await deleteFromR2(reel.video.cloudinaryId);
        // Delete thumbnail (replace videos path with thumbnails)
        const thumbnailKey = reel.video.cloudinaryId.replace('/videos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg');
        await deleteFromR2(thumbnailKey);
      }
    } catch (r2Error) {
      console.error("R2 deletion error:", r2Error);
      // Continue with database deletion even if R2 deletion fails
    }

    reel.status = 'deleted';
    await reel.save();

    res.json({ message: "Reel deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Removed: with-link endpoint (uploads only)

// Search reels
export const searchReels = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchQuery = {
      $and: [
        { status: 'active' },
        { isApproved: true },
        { visibility: 'public' },
        {
          $or: [
            { caption: { $regex: q, $options: 'i' } },
            { hashtags: { $in: [q.toLowerCase()] } },
            { 'rideContext.bikeType': { $regex: q, $options: 'i' } },
            { 'rideContext.terrain': { $regex: q, $options: 'i' } }
          ]
        }
      ]
    };

    const reels = await Reel.find(searchQuery)
      .populate('creator', 'name avatar username')
      .sort({ trendingScore: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      query: q,
      reels: reels.map(reel => ({
        _id: reel._id,
        creator: {
          _id: reel.creator._id,
          name: reel.creator.name,
          username: reel.creator.username,
          avatar: reel.creator.avatar
        },
        video: reel.video,
        audio: reel.audio,
        caption: reel.caption,
        hashtags: reel.hashtags,
        location: reel.location,
        rideContext: reel.rideContext,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        views: reel.views,
        createdAt: reel.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: reels.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
