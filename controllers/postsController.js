// controllers/postsController.js
import Post from "../models/Post.js";
import User from "../models/User.js";

// Create a new post or ride event
export const createPost = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const {
      content,
      media = [],
      route_id,
      tags = ['general'],
      type = 'general',
      location,
      rideDetails,
      eventDetails,
      visibility = 'public'
    } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Content is required" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: "Content too long (max 2000 characters)" });
    }

    // Validate tags
    const validTags = ['rides', 'events', 'tips', 'gear', 'photos', 'videos', 'general'];
    const invalidTags = tags.filter(tag => !validTags.includes(tag));
    if (invalidTags.length > 0) {
      return res.status(400).json({ 
        message: `Invalid tags: ${invalidTags.join(', ')}` 
      });
    }

    // Validate type
    const validTypes = ['ride', 'event', 'tip', 'photo', 'general'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    // Create post
    const post = await Post.create({
      author: userId,
      content: content.trim(),
      media,
      route_id,
      tags,
      type,
      location,
      rideDetails,
      eventDetails,
      visibility
    });

    // Populate author details
    await post.populate('author', 'name avatar bikes location');
    if (route_id) {
      await post.populate('route_id', 'name distance duration');
    }

    res.status(201).json({
      message: "Post created successfully",
      post: {
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
        route: post.route_id,
        rideDetails: post.rideDetails,
        eventDetails: post.eventDetails,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get post details and comments
export const getPostDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('author', 'name avatar bikes location')
      .populate('route_id', 'name distance duration')
      .populate('likes.user', 'name avatar')
      .populate('comments.author', 'name avatar');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.status !== 'active') {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({
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
      route: post.route_id,
      rideDetails: post.rideDetails,
      eventDetails: post.eventDetails,
      visibility: post.visibility,
      likes: post.likes.map(like => ({
        user: {
          _id: like.user._id,
          name: like.user.name,
          avatar: like.user.avatar
        },
        createdAt: like.createdAt
      })),
      comments: post.comments.map(comment => ({
        _id: comment._id,
        author: {
          _id: comment.author._id,
          name: comment.author.name,
          avatar: comment.author.avatar
        },
        content: comment.content,
        createdAt: comment.createdAt
      })),
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Like/Unlike a post
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLike = post.likes.find(like => 
      like.user.toString() === userId.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => 
        like.user.toString() !== userId.toString()
      );
      await post.save();
      
      res.json({
        message: "Post unliked",
        liked: false,
        likesCount: post.likesCount
      });
    } else {
      // Like
      post.likes.push({ user: userId });
      await post.save();
      
      res.json({
        message: "Post liked",
        liked: true,
        likesCount: post.likesCount
      });
    }

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add comment to post
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

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      author: userId,
      content: content.trim()
    });

    await post.save();
    await post.populate('comments.author', 'name avatar');

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        _id: newComment._id,
        author: {
          _id: newComment.author._id,
          name: newComment.author.name,
          avatar: newComment.author.avatar
        },
        content: newComment.content,
        createdAt: newComment.createdAt
      },
      commentsCount: post.commentsCount
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a comment from a post (comment author or post author)
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id).populate('comments.author', 'name avatar');
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only the comment author or the post author can delete the comment
    if (comment.author.toString() !== userId.toString() && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    // Remove the comment
    comment.remove();
    await post.save();

    res.json({ message: "Comment deleted successfully", commentsCount: post.commentsCount });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update post (only by author)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { content, media, tags, location, rideDetails, eventDetails } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    // Update fields
    if (content !== undefined) {
      if (content.length > 2000) {
        return res.status(400).json({ message: "Content too long (max 2000 characters)" });
      }
      post.content = content.trim();
    }
    
    if (media !== undefined) post.media = media;
    if (tags !== undefined) post.tags = tags;
    if (location !== undefined) post.location = location;
    if (rideDetails !== undefined) post.rideDetails = rideDetails;
    if (eventDetails !== undefined) post.eventDetails = eventDetails;

    await post.save();
    await post.populate('author', 'name avatar');

    res.json({
      message: "Post updated successfully",
      post: {
        _id: post._id,
        author: {
          _id: post.author._id,
          name: post.author.name,
          avatar: post.author.avatar
        },
        content: post.content,
        media: post.media,
        tags: post.tags,
        location: post.location,
        rideDetails: post.rideDetails,
        eventDetails: post.eventDetails,
        updatedAt: post.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete post (only by author)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    post.status = 'deleted';
    await post.save();

    res.json({ message: "Post deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
