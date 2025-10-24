// controllers/analyticsController.js
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import TrackingSession from "../models/TrackingSession.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y, all

    // Calculate date range
    const dateRange = getDateRange(period);
    
    // Get user's trip statistics
    const tripStats = await Trip.aggregate([
      { $match: { organizer: userId } },
      { $match: dateRange ? { createdAt: dateRange } : {} },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalDistance: { $sum: '$distance' },
          avgDistance: { $avg: '$distance' },
          totalParticipants: { $sum: { $size: '$participants' } }
        }
      }
    ]);

    // Get user's tracking session statistics
    const trackingStats = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalRideDistance: { $sum: '$totalDistance' },
          totalRideTime: { $sum: '$totalDuration' },
          avgSpeed: { $avg: '$averageSpeed' },
          maxSpeed: { $max: '$maxSpeed' },
          totalPauseTime: { $sum: '$totalPauseTime' }
        }
      }
    ]);

    // Get user's post statistics
    const postStats = await Post.aggregate([
      { $match: { author: userId } },
      { $match: dateRange ? { createdAt: dateRange } : {} },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalComments: { $sum: '$commentsCount' },
          avgLikes: { $avg: '$likesCount' },
          avgComments: { $avg: '$commentsCount' }
        }
      }
    ]);

    // Get user's social statistics
    const socialStats = await User.findById(userId).select('friends pendingRequests sentRequests');
    
    // Get user's notification statistics
    const notificationStats = await Notification.aggregate([
      { $match: { recipient: userId } },
      { $match: dateRange ? { createdAt: dateRange } : {} },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get monthly activity breakdown
    const monthlyActivity = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: {
            year: { $year: '$startedAt' },
            month: { $month: '$startedAt' }
          },
          sessions: { $sum: 1 },
          distance: { $sum: '$totalDistance' },
          duration: { $sum: '$totalDuration' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get bike usage statistics
    const bikeStats = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: { 'bikeUsed.brand': { $exists: true } } },
      {
        $group: {
          _id: '$bikeUsed.brand',
          count: { $sum: 1 },
          totalDistance: { $sum: '$totalDistance' },
          avgSpeed: { $avg: '$averageSpeed' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      period,
      dateRange: dateRange ? { start: dateRange.$gte, end: dateRange.$lte } : null,
      tripStats: tripStats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        activeTrips: 0,
        totalDistance: 0,
        avgDistance: 0,
        totalParticipants: 0
      },
      trackingStats: trackingStats[0] || {
        totalSessions: 0,
        completedSessions: 0,
        totalRideDistance: 0,
        totalRideTime: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        totalPauseTime: 0
      },
      postStats: postStats[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        avgLikes: 0,
        avgComments: 0
      },
      socialStats: {
        totalFriends: socialStats?.friends?.length || 0,
        pendingRequests: socialStats?.pendingRequests?.length || 0,
        sentRequests: socialStats?.sentRequests?.length || 0
      },
      notificationStats: notificationStats[0] || {
        totalNotifications: 0,
        unreadNotifications: 0,
        readNotifications: 0
      },
      monthlyActivity,
      bikeStats
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get trip statistics
export const getTripStats = async (req, res) => {
  try {
    const { period = '30d', tripId } = req.query;

    const dateRange = getDateRange(period);
    const matchQuery = dateRange ? { createdAt: dateRange } : {};
    
    if (tripId) {
      matchQuery._id = tripId;
    }

    // Overall trip statistics
    const overallStats = await Trip.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          cancelledTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalDistance: { $sum: '$distance' },
          avgDistance: { $avg: '$distance' },
          totalParticipants: { $sum: { $size: '$participants' } },
          avgParticipants: { $avg: { $size: '$participants' } }
        }
      }
    ]);

    // Trip type breakdown
    const typeBreakdown = await Trip.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$tripType',
          count: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          avgDistance: { $avg: '$distance' },
          totalParticipants: { $sum: { $size: '$participants' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Difficulty breakdown
    const difficultyBreakdown = await Trip.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          avgDistance: { $avg: '$distance' },
          avgDuration: { $avg: '$estimatedDuration' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Monthly trip trends
    const monthlyTrends = await Trip.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          trips: { $sum: 1 },
          distance: { $sum: '$distance' },
          participants: { $sum: { $size: '$participants' } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Top organizers
    const topOrganizers = await Trip.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$organizer',
          tripCount: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          totalParticipants: { $sum: { $size: '$participants' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: '$organizer' },
      {
        $project: {
          organizer: {
            _id: '$organizer._id',
            name: '$organizer.name',
            avatar: '$organizer.avatar'
          },
          tripCount: 1,
          totalDistance: 1,
          totalParticipants: 1
        }
      },
      { $sort: { tripCount: -1 } },
      { $limit: 10 }
    ]);

    // Trip completion rate
    const completionRate = overallStats[0] ? 
      (overallStats[0].completedTrips / overallStats[0].totalTrips * 100).toFixed(2) : 0;

    res.json({
      period,
      tripId: tripId || null,
      overallStats: overallStats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        activeTrips: 0,
        cancelledTrips: 0,
        totalDistance: 0,
        avgDistance: 0,
        totalParticipants: 0,
        avgParticipants: 0
      },
      completionRate: parseFloat(completionRate),
      typeBreakdown,
      difficultyBreakdown,
      monthlyTrends,
      topOrganizers
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get ride history analytics
export const getRideHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d', limit = 50 } = req.query;

    const dateRange = getDateRange(period);

    // Get ride history with trip details
    const rideHistory = await TrackingSession.find({
      rider: userId,
      ...(dateRange && { startedAt: dateRange })
    })
      .populate('trip', 'title startLocation endLocation distance estimatedDuration')
      .sort({ startedAt: -1 })
      .limit(parseInt(limit));

    // Calculate ride statistics
    const rideStats = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalDistance: { $sum: '$totalDistance' },
          totalDuration: { $sum: '$totalDuration' },
          avgSpeed: { $avg: '$averageSpeed' },
          maxSpeed: { $max: '$maxSpeed' },
          avgDistance: { $avg: '$totalDistance' },
          avgDuration: { $avg: '$totalDuration' },
          totalPauseTime: { $sum: '$totalPauseTime' }
        }
      }
    ]);

    // Get ride frequency by day of week
    const dayOfWeekStats = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: { $dayOfWeek: '$startedAt' },
          rides: { $sum: 1 },
          distance: { $sum: '$totalDistance' },
          duration: { $sum: '$totalDuration' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get ride frequency by hour
    const hourStats = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: { $hour: '$startedAt' },
          rides: { $sum: 1 },
          distance: { $sum: '$totalDistance' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get longest and fastest rides
    const longestRide = await TrackingSession.findOne({
      rider: userId,
      ...(dateRange && { startedAt: dateRange })
    })
      .populate('trip', 'title')
      .sort({ totalDistance: -1 });

    const fastestRide = await TrackingSession.findOne({
      rider: userId,
      ...(dateRange && { startedAt: dateRange })
    })
      .populate('trip', 'title')
      .sort({ maxSpeed: -1 });

    // Get recent ride trends
    const recentTrends = await TrackingSession.aggregate([
      { $match: { rider: userId } },
      { $match: dateRange ? { startedAt: dateRange } : {} },
      {
        $group: {
          _id: {
            year: { $year: '$startedAt' },
            month: { $month: '$startedAt' },
            day: { $dayOfMonth: '$startedAt' }
          },
          rides: { $sum: 1 },
          distance: { $sum: '$totalDistance' },
          duration: { $sum: '$totalDuration' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);

    res.json({
      period,
      rideHistory: rideHistory.map(ride => ({
        _id: ride._id,
        sessionId: ride.sessionId,
        trip: ride.trip ? {
          _id: ride.trip._id,
          title: ride.trip.title,
          startLocation: ride.trip.startLocation,
          endLocation: ride.trip.endLocation,
          distance: ride.trip.distance,
          estimatedDuration: ride.trip.estimatedDuration
        } : null,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        totalDistance: ride.totalDistance,
        totalDuration: ride.totalDuration,
        averageSpeed: ride.averageSpeed,
        maxSpeed: ride.maxSpeed,
        status: ride.status
      })),
      rideStats: rideStats[0] || {
        totalRides: 0,
        totalDistance: 0,
        totalDuration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        avgDistance: 0,
        avgDuration: 0,
        totalPauseTime: 0
      },
      dayOfWeekStats,
      hourStats,
      longestRide: longestRide ? {
        _id: longestRide._id,
        trip: longestRide.trip?.title,
        distance: longestRide.totalDistance,
        duration: longestRide.totalDuration,
        startedAt: longestRide.startedAt
      } : null,
      fastestRide: fastestRide ? {
        _id: fastestRide._id,
        trip: fastestRide.trip?.title,
        maxSpeed: fastestRide.maxSpeed,
        distance: fastestRide.totalDistance,
        startedAt: fastestRide.startedAt
      } : null,
      recentTrends
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const { type = 'distance', period = '30d', limit = 50 } = req.query;

    const dateRange = getDateRange(period);

    let leaderboard = [];

    switch (type) {
      case 'distance':
        leaderboard = await getDistanceLeaderboard(dateRange, parseInt(limit));
        break;
      case 'trips':
        leaderboard = await getTripsLeaderboard(dateRange, parseInt(limit));
        break;
      case 'speed':
        leaderboard = await getSpeedLeaderboard(dateRange, parseInt(limit));
        break;
      case 'social':
        leaderboard = await getSocialLeaderboard(parseInt(limit));
        break;
      case 'posts':
        leaderboard = await getPostsLeaderboard(dateRange, parseInt(limit));
        break;
      default:
        return res.status(400).json({ message: "Invalid leaderboard type" });
    }

    res.json({
      type,
      period,
      leaderboard,
      totalUsers: leaderboard.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper functions
const getDateRange = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      return null;
  }

  return {
    $gte: startDate,
    $lte: now
  };
};

const getDistanceLeaderboard = async (dateRange, limit) => {
  return await TrackingSession.aggregate([
    { $match: dateRange ? { startedAt: dateRange } : {} },
    {
      $group: {
        _id: '$rider',
        totalDistance: { $sum: '$totalDistance' },
        totalRides: { $sum: 1 },
        avgSpeed: { $avg: '$averageSpeed' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          location: '$user.location'
        },
        totalDistance: { $round: ['$totalDistance', 2] },
        totalRides: 1,
        avgSpeed: { $round: ['$avgSpeed', 2] }
      }
    },
    { $sort: { totalDistance: -1 } },
    { $limit: limit }
  ]);
};

const getTripsLeaderboard = async (dateRange, limit) => {
  return await Trip.aggregate([
    { $match: dateRange ? { createdAt: dateRange } : {} },
    {
      $group: {
        _id: '$organizer',
        totalTrips: { $sum: 1 },
        completedTrips: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalDistance: { $sum: '$distance' },
        totalParticipants: { $sum: { $size: '$participants' } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          location: '$user.location'
        },
        totalTrips: 1,
        completedTrips: 1,
        totalDistance: { $round: ['$totalDistance', 2] },
        totalParticipants: 1
      }
    },
    { $sort: { totalTrips: -1 } },
    { $limit: limit }
  ]);
};

const getSpeedLeaderboard = async (dateRange, limit) => {
  return await TrackingSession.aggregate([
    { $match: dateRange ? { startedAt: dateRange } : {} },
    {
      $group: {
        _id: '$rider',
        maxSpeed: { $max: '$maxSpeed' },
        avgSpeed: { $avg: '$averageSpeed' },
        totalRides: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          location: '$user.location'
        },
        maxSpeed: { $round: ['$maxSpeed', 2] },
        avgSpeed: { $round: ['$avgSpeed', 2] },
        totalRides: 1
      }
    },
    { $sort: { maxSpeed: -1 } },
    { $limit: limit }
  ]);
};

const getSocialLeaderboard = async (limit) => {
  return await User.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        location: 1,
        totalFriends: { $size: '$friends' },
        totalTrips: 1
      }
    },
    { $sort: { totalFriends: -1 } },
    { $limit: limit }
  ]);
};

const getPostsLeaderboard = async (dateRange, limit) => {
  return await Post.aggregate([
    { $match: dateRange ? { createdAt: dateRange } : {} },
    {
      $group: {
        _id: '$author',
        totalPosts: { $sum: 1 },
        totalLikes: { $sum: '$likesCount' },
        totalComments: { $sum: '$commentsCount' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          location: '$user.location'
        },
        totalPosts: 1,
        totalLikes: 1,
        totalComments: 1
      }
    },
    { $sort: { totalLikes: -1 } },
    { $limit: limit }
  ]);
};
