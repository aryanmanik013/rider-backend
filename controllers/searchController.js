// controllers/searchController.js
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Post from "../models/Post.js";
import TrackingSession from "../models/TrackingSession.js";
import mongoose from "mongoose";

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { 
      q = '', 
      page = 1, 
      limit = 20, 
      location, 
      bikeBrand, 
      minTrips, 
      maxTrips,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const query = { isIncomplete: { $ne: true } };
    
    // Text search
    if (q.trim()) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Bike brand filter
    if (bikeBrand) {
      query['bikes.brand'] = { $regex: bikeBrand, $options: 'i' };
    }

    // Trip count filters
    if (minTrips || maxTrips) {
      query.totalTrips = {};
      if (minTrips) query.totalTrips.$gte = parseInt(minTrips);
      if (maxTrips) query.totalTrips.$lte = parseInt(maxTrips);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'name':
        sort.name = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'trips':
        sort.totalTrips = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'recent':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        sort = { totalTrips: -1, createdAt: -1 };
        break;
    }

    const users = await User.find(query)
      .select('name avatar bio location bikes totalTrips friends createdAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    // Format response
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      bikes: user.bikes,
      totalTrips: user.totalTrips,
      friendsCount: user.friends.length,
      isFriend: user.friends.some(friend => friend.user.toString() === userId),
      joinedAt: user.createdAt
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasMore: skip + users.length < totalUsers
      },
      filters: {
        query: q,
        location,
        bikeBrand,
        minTrips,
        maxTrips,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search trips
export const searchTrips = async (req, res) => {
  try {
    const { 
      q = '', 
      page = 1, 
      limit = 20, 
      location, 
      difficulty, 
      tripType, 
      startDate, 
      endDate,
      minDistance,
      maxDistance,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const query = { status: { $in: ['planned', 'active'] } };
    
    // Text search
    if (q.trim()) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { stops: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query.$or = [
        { stops: { $regex: location, $options: 'i' } },
        { 'waypoints.name': { $regex: location, $options: 'i' } }
      ];
    }

    // Difficulty filter
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Trip type filter
    if (tripType) {
      query.tripType = tripType;
    }

    // Date range filter
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Distance filters
    if (minDistance || maxDistance) {
      query.totalDistance = {};
      if (minDistance) query.totalDistance.$gte = parseFloat(minDistance);
      if (maxDistance) query.totalDistance.$lte = parseFloat(maxDistance);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date':
        sort.scheduledDate = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'distance':
        sort.totalDistance = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'participants':
        sort['participants.length'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'recent':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'relevance':
      default:
        sort = { scheduledDate: 1, createdAt: -1 };
        break;
    }

    const trips = await Trip.find(query)
      .populate('organizer', 'name avatar')
      .populate('participants.user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalTrips = await Trip.countDocuments(query);

    // Format response
    const formattedTrips = trips.map(trip => ({
      _id: trip._id,
      title: trip.title,
      description: trip.description,
      organizer: {
        _id: trip.organizer._id,
        name: trip.organizer.name,
        avatar: trip.organizer.avatar
      },
      waypoints: trip.waypoints,
      stops: trip.stops,
      scheduledDate: trip.scheduledDate,
      difficulty: trip.difficulty,
      tripType: trip.tripType,
      totalDistance: trip.totalDistance,
      estimatedDuration: trip.estimatedDuration,
      participants: trip.participants.map(p => ({
        _id: p.user._id,
        name: p.user.name,
        avatar: p.user.avatar,
        status: p.status,
        joinedAt: p.joinedAt
      })),
      maxParticipants: trip.maxParticipants,
      isJoined: trip.participants.some(p => p.user._id.toString() === userId),
      visibility: trip.visibility,
      createdAt: trip.createdAt
    }));

    res.json({
      trips: formattedTrips,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTrips / parseInt(limit)),
        totalTrips,
        hasMore: skip + trips.length < totalTrips
      },
      filters: {
        query: q,
        location,
        difficulty,
        tripType,
        startDate,
        endDate,
        minDistance,
        maxDistance,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search posts
export const searchPosts = async (req, res) => {
  try {
    const { 
      q = '', 
      page = 1, 
      limit = 20, 
      type, 
      location, 
      hashtags, 
      authorId,
      startDate, 
      endDate,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const query = {};
    
    // Text search
    if (q.trim()) {
      query.$or = [
        { content: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    // Post type filter
    if (type) {
      query.type = type;
    }

    // Location filter
    if (location) {
      query['location.name'] = { $regex: location, $options: 'i' };
    }

    // Hashtags filter
    if (hashtags) {
      const hashtagArray = hashtags.split(',').map(tag => tag.trim());
      query.tags = { $in: hashtagArray };
    }

    // Author filter
    if (authorId) {
      query.author = authorId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'likes':
        sort.likesCount = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'comments':
        sort.commentsCount = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'relevance':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const posts = await Post.find(query)
      .populate('author', 'name avatar')
      .populate('trip', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(query);

    // Format response
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      type: post.type,
      author: {
        _id: post.author._id,
        name: post.author.name,
        avatar: post.author.avatar
      },
      trip: post.trip ? {
        _id: post.trip._id,
        title: post.trip.title
      } : null,
      media: post.media,
      location: post.location,
      tags: post.tags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      isLiked: post.likes.some(like => like.user.toString() === userId),
      visibility: post.visibility,
      createdAt: post.createdAt
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / parseInt(limit)),
        totalPosts,
        hasMore: skip + posts.length < totalPosts
      },
      filters: {
        query: q,
        type,
        location,
        hashtags,
        authorId,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search routes (from tracking sessions)
export const searchRoutes = async (req, res) => {
  try {
    const { 
      q = '', 
      page = 1, 
      limit = 20, 
      location, 
      minDistance, 
      maxDistance,
      minDuration,
      maxDuration,
      startDate, 
      endDate,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const query = { status: 'completed' };
    
    // Text search
    if (q.trim()) {
      query.$or = [
        { tripName: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { 'routePoints.name': { $regex: q, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query.$or = [
        { 'routePoints.name': { $regex: location, $options: 'i' } },
        { 'startLocation.name': { $regex: location, $options: 'i' } },
        { 'endLocation.name': { $regex: location, $options: 'i' } }
      ];
    }

    // Distance filters
    if (minDistance || maxDistance) {
      query.totalDistance = {};
      if (minDistance) query.totalDistance.$gte = parseFloat(minDistance);
      if (maxDistance) query.totalDistance.$lte = parseFloat(maxDistance);
    }

    // Duration filters
    if (minDuration || maxDuration) {
      query.totalDuration = {};
      if (minDuration) query.totalDuration.$gte = parseInt(minDuration);
      if (maxDuration) query.totalDuration.$lte = parseInt(maxDuration);
    }

    // Date range filter
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'distance':
        sort.totalDistance = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'duration':
        sort.totalDuration = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'date':
        sort.startedAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'relevance':
      default:
        sort = { startedAt: -1 };
        break;
    }

    const routes = await TrackingSession.find(query)
      .populate('rider', 'name avatar')
      .populate('trip', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRoutes = await TrackingSession.countDocuments(query);

    // Format response
    const formattedRoutes = routes.map(route => ({
      _id: route._id,
      tripName: route.tripName,
      rider: {
        _id: route.rider._id,
        name: route.rider.name,
        avatar: route.rider.avatar
      },
      trip: route.trip ? {
        _id: route.trip._id,
        title: route.trip.title
      } : null,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      routePoints: route.routePoints.slice(0, 10), // Limit points for performance
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      maxSpeed: route.maxSpeed,
      averageSpeed: route.averageSpeed,
      startedAt: route.startedAt,
      endedAt: route.endedAt,
      notes: route.notes,
      weather: route.weather,
      roadConditions: route.roadConditions,
      isPublic: route.isPublic
    }));

    res.json({
      routes: formattedRoutes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRoutes / parseInt(limit)),
        totalRoutes,
        hasMore: skip + routes.length < totalRoutes
      },
      filters: {
        query: q,
        location,
        minDistance,
        maxDistance,
        minDuration,
        maxDuration,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Global search across all entities
export const globalSearch = async (req, res) => {
  try {
    const { q = '', page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    if (!q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchQuery = { $regex: q, $options: 'i' };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search users
    const users = await User.find({
      $or: [
        { name: searchQuery },
        { bio: searchQuery },
        { location: searchQuery }
      ],
      isIncomplete: { $ne: true }
    })
    .select('name avatar bio location totalTrips')
    .limit(3)
    .sort({ totalTrips: -1 });

    // Search trips
    const trips = await Trip.find({
      $or: [
        { title: searchQuery },
        { description: searchQuery },
        { stops: searchQuery }
      ],
      status: { $in: ['planned', 'active'] }
    })
    .populate('organizer', 'name avatar')
    .limit(3)
    .sort({ scheduledDate: 1 });

    // Search posts
    const posts = await Post.find({
      $or: [
        { content: searchQuery },
        { title: searchQuery },
        { tags: searchQuery }
      ]
    })
    .populate('author', 'name avatar')
    .limit(3)
    .sort({ createdAt: -1 });

    // Search routes
    const routes = await TrackingSession.find({
      $or: [
        { tripName: searchQuery },
        { notes: searchQuery }
      ],
      status: 'completed'
    })
    .populate('rider', 'name avatar')
    .limit(3)
    .sort({ startedAt: -1 });

    res.json({
      query: q,
      results: {
        users: users.map(user => ({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          totalTrips: user.totalTrips,
          type: 'user'
        })),
        trips: trips.map(trip => ({
          _id: trip._id,
          title: trip.title,
          organizer: trip.organizer,
          scheduledDate: trip.scheduledDate,
          type: 'trip'
        })),
        posts: posts.map(post => ({
          _id: post._id,
          title: post.title,
          content: post.content.substring(0, 100) + '...',
          author: post.author,
          type: 'post'
        })),
        routes: routes.map(route => ({
          _id: route._id,
          tripName: route.tripName,
          rider: route.rider,
          totalDistance: route.totalDistance,
          startedAt: route.startedAt,
          type: 'route'
        }))
      },
      totalResults: users.length + trips.length + posts.length + routes.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
