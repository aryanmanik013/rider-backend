// controllers/feedController.js
import Post from "../models/Post.js";
import User from "../models/User.js";

// Fetch community feed with pagination and filters
export const getCommunityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10, filters = {} } = req.query;
    const { tag, type, author } = filters;

    // Build query
    const query = { status: 'active' };

    // Apply filters
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    if (type) {
      query.type = type;
    }
    
    if (author) {
      query.author = author;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch posts with author population
    const posts = await Post.find(query)
      .populate('author', 'name avatar bikes location')
      .populate('route_id', 'name distance duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / parseInt(limit));

    // Format response
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      author: {
        _id: post.author._id,
        name: post.author.name,
        avatar: post.author.avatar,
        bikes: post.author.bikes,
        location: post.author.location
      },
      content: post.content,
      media: post.media,
      tags: post.tags,
      type: post.type,
      location: post.location,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      route: post.route_id,
      rideDetails: post.rideDetails,
      eventDetails: post.eventDetails,
      visibility: post.visibility,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        tag: tag || null,
        type: type || null,
        author: author || null
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get trending posts (most liked in last 7 days)
export const getTrendingPosts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingPosts = await Post.find({
      status: 'active',
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('author', 'name avatar')
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      trendingPosts: trendingPosts.map(post => ({
        _id: post._id,
        author: {
          _id: post.author._id,
          name: post.author.name,
          avatar: post.author.avatar
        },
        content: post.content,
        media: post.media,
        tags: post.tags,
        type: post.type,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt
      }))
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get posts by specific user
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      author: userId,
      status: 'active'
    })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments({
      author: userId,
      status: 'active'
    });

    res.json({
      posts: posts.map(post => ({
        _id: post._id,
        content: post.content,
        media: post.media,
        tags: post.tags,
        type: post.type,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / parseInt(limit)),
        totalPosts
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
