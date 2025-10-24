// controllers/achievementsController.js
import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import TrackingSession from "../models/TrackingSession.js";
import Trip from "../models/Trip.js";
import Post from "../models/Post.js";

// Get all achievements
export const getAchievements = async (req, res) => {
  try {
    const { category, rarity, unlocked, limit = 50 } = req.query;
    const userId = req.user._id;

    const query = { isActive: true };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by rarity
    if (rarity) {
      query.rarity = rarity;
    }

    const achievements = await Achievement.find(query)
      .sort({ category: 1, rarity: 1, createdAt: 1 })
      .limit(parseInt(limit));

    // Get user's unlocked achievements
    const user = await User.findById(userId).select('achievements.unlocked');
    const unlockedAchievementIds = user.achievements.unlocked.map(u => u.achievement.toString());

    // Format achievements with unlock status
    const formattedAchievements = achievements.map(achievement => ({
      _id: achievement._id,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      type: achievement.type,
      rarity: achievement.rarity,
      requirements: achievement.requirements,
      rewards: achievement.rewards,
      icon: achievement.icon,
      color: achievement.color,
      isHidden: achievement.isHidden,
      expiresAt: achievement.expiresAt,
      tags: achievement.tags,
      stats: achievement.stats,
      isUnlocked: unlockedAchievementIds.includes(achievement._id.toString()),
      unlockedAt: user.achievements.unlocked.find(u => 
        u.achievement.toString() === achievement._id.toString()
      )?.unlockedAt || null,
      progress: user.achievements.unlocked.find(u => 
        u.achievement.toString() === achievement._id.toString()
      )?.progress || 0,
      createdAt: achievement.createdAt
    }));

    // Filter by unlock status if requested
    let filteredAchievements = formattedAchievements;
    if (unlocked === 'true') {
      filteredAchievements = formattedAchievements.filter(a => a.isUnlocked);
    } else if (unlocked === 'false') {
      filteredAchievements = formattedAchievements.filter(a => !a.isUnlocked);
    }

    res.json({
      achievements: filteredAchievements,
      totalAchievements: achievements.length,
      unlockedCount: unlockedAchievementIds.length,
      categories: [...new Set(achievements.map(a => a.category))],
      rarities: [...new Set(achievements.map(a => a.rarity))]
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unlock achievement
export const unlockAchievement = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const userId = req.user._id;

    // Check if achievement exists
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    // Check if achievement is active
    if (!achievement.isActive) {
      return res.status(400).json({ message: "Achievement is not active" });
    }

    // Check if achievement has expired
    if (achievement.expiresAt && new Date() > achievement.expiresAt) {
      return res.status(400).json({ message: "Achievement has expired" });
    }

    // Get user with achievements
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already unlocked
    const alreadyUnlocked = user.achievements.unlocked.some(u => 
      u.achievement.toString() === achievementId
    );

    if (alreadyUnlocked && achievement.type === 'single') {
      return res.status(400).json({ message: "Achievement already unlocked" });
    }

    // Calculate user stats for requirement checking
    const userStats = await calculateUserStats(userId);

    // Check if user meets requirements
    if (!achievement.canUnlock(userStats)) {
      return res.status(400).json({ 
        message: "Requirements not met",
        requirements: achievement.requirements,
        userStats: userStats
      });
    }

    // Unlock achievement
    const unlockData = {
      achievement: achievementId,
      unlockedAt: new Date(),
      progress: 100,
      level: 1
    };

    // Add to unlocked achievements
    user.achievements.unlocked.push(unlockData);

    // Add points and experience
    if (achievement.rewards.points) {
      user.achievements.totalPoints += achievement.rewards.points;
      user.achievements.experience += achievement.rewards.points;
    }

    // Add badge if exists
    if (achievement.rewards.badge) {
      user.achievements.badges.push({
        name: achievement.rewards.badge.name,
        icon: achievement.rewards.badge.icon,
        color: achievement.rewards.badge.color,
        earnedAt: new Date()
      });
    }

    // Add title if exists
    if (achievement.rewards.title) {
      user.achievements.titles.push({
        name: achievement.rewards.title,
        description: achievement.description,
        earnedAt: new Date(),
        isActive: false
      });
    }

    // Calculate new level
    const newLevel = calculateLevel(user.achievements.experience);
    user.achievements.level = newLevel;

    await user.save();

    // Update achievement stats
    achievement.stats.totalUnlocked += 1;
    await achievement.save();

    res.json({
      message: "Achievement unlocked successfully!",
      achievement: {
        _id: achievement._id,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        rarity: achievement.rarity,
        rewards: achievement.rewards,
        icon: achievement.icon,
        color: achievement.color
      },
      userStats: {
        totalPoints: user.achievements.totalPoints,
        level: user.achievements.level,
        experience: user.achievements.experience,
        unlockedCount: user.achievements.unlocked.length
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get achievement leaderboard
export const getAchievementLeaderboard = async (req, res) => {
  try {
    const { type = 'points', period = '30d', limit = 50 } = req.query;

    const dateRange = getDateRange(period);

    let leaderboard = [];

    switch (type) {
      case 'points':
        leaderboard = await getPointsLeaderboard(dateRange, parseInt(limit));
        break;
      case 'achievements':
        leaderboard = await getAchievementsCountLeaderboard(dateRange, parseInt(limit));
        break;
      case 'level':
        leaderboard = await getLevelLeaderboard(parseInt(limit));
        break;
      case 'streaks':
        leaderboard = await getStreaksLeaderboard(parseInt(limit));
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

// Get user's achievement progress
export const getUserAchievementProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('achievements');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all active achievements
    const achievements = await Achievement.find({ isActive: true });
    
    // Calculate user stats
    const userStats = await calculateUserStats(userId);

    // Calculate progress for each achievement
    const progressData = achievements.map(achievement => {
      const unlocked = user.achievements.unlocked.find(u => 
        u.achievement.toString() === achievement._id.toString()
      );

      let progress = 0;
      let canUnlock = false;

      if (!unlocked || achievement.type === 'recurring') {
        switch (achievement.category) {
          case 'distance':
            progress = Math.min(100, (userStats.totalDistance / (achievement.requirements.distance || 1)) * 100);
            canUnlock = userStats.totalDistance >= (achievement.requirements.distance || 0);
            break;
          case 'speed':
            progress = Math.min(100, (userStats.maxSpeed / (achievement.requirements.speed || 1)) * 100);
            canUnlock = userStats.maxSpeed >= (achievement.requirements.speed || 0);
            break;
          case 'trips':
            progress = Math.min(100, (userStats.totalTrips / (achievement.requirements.trips || 1)) * 100);
            canUnlock = userStats.totalTrips >= (achievement.requirements.trips || 0);
            break;
          case 'social':
            progress = Math.min(100, (userStats.totalFriends / (achievement.requirements.friends || 1)) * 100);
            canUnlock = userStats.totalFriends >= (achievement.requirements.friends || 0);
            break;
          case 'posts':
            progress = Math.min(100, (userStats.totalPosts / (achievement.requirements.posts || 1)) * 100);
            canUnlock = userStats.totalPosts >= (achievement.requirements.posts || 0);
            break;
          default:
            progress = 0;
            canUnlock = false;
        }
      } else {
        progress = 100;
        canUnlock = true;
      }

      return {
        achievement: {
          _id: achievement._id,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          rarity: achievement.rarity,
          requirements: achievement.requirements,
          rewards: achievement.rewards,
          icon: achievement.icon,
          color: achievement.color
        },
        progress: Math.round(progress),
        canUnlock,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null
      };
    });

    res.json({
      userStats: {
        totalPoints: user.achievements.totalPoints,
        level: user.achievements.level,
        experience: user.achievements.experience,
        unlockedCount: user.achievements.unlocked.length,
        badges: user.achievements.badges,
        titles: user.achievements.titles,
        streaks: user.achievements.streaks
      },
      achievements: progressData
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper functions
const calculateUserStats = async (userId) => {
  const [trackingStats, tripStats, postStats, socialStats] = await Promise.all([
    TrackingSession.aggregate([
      { $match: { rider: userId } },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$totalDistance' },
          maxSpeed: { $max: '$maxSpeed' },
          totalRides: { $sum: 1 }
        }
      }
    ]),
    Trip.aggregate([
      { $match: { organizer: userId } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 }
        }
      }
    ]),
    Post.aggregate([
      { $match: { author: userId } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 }
        }
      }
    ]),
    User.findById(userId).select('friends')
  ]);

  return {
    totalDistance: trackingStats[0]?.totalDistance || 0,
    maxSpeed: trackingStats[0]?.maxSpeed || 0,
    totalRides: trackingStats[0]?.totalRides || 0,
    totalTrips: tripStats[0]?.totalTrips || 0,
    totalPosts: postStats[0]?.totalPosts || 0,
    totalFriends: socialStats?.friends?.length || 0
  };
};

const calculateLevel = (experience) => {
  // Simple level calculation: every 1000 points = 1 level
  return Math.floor(experience / 1000) + 1;
};

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

const getPointsLeaderboard = async (dateRange, limit) => {
  return await User.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        location: 1,
        totalPoints: '$achievements.totalPoints',
        level: '$achievements.level',
        unlockedCount: { $size: '$achievements.unlocked' }
      }
    },
    { $sort: { totalPoints: -1 } },
    { $limit: limit }
  ]);
};

const getAchievementsCountLeaderboard = async (dateRange, limit) => {
  return await User.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        location: 1,
        unlockedCount: { $size: '$achievements.unlocked' },
        totalPoints: '$achievements.totalPoints',
        level: '$achievements.level'
      }
    },
    { $sort: { unlockedCount: -1 } },
    { $limit: limit }
  ]);
};

const getLevelLeaderboard = async (limit) => {
  return await User.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        location: 1,
        level: '$achievements.level',
        experience: '$achievements.experience',
        totalPoints: '$achievements.totalPoints'
      }
    },
    { $sort: { level: -1, experience: -1 } },
    { $limit: limit }
  ]);
};

const getStreaksLeaderboard = async (limit) => {
  return await User.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        location: 1,
        ridingStreak: '$achievements.streaks.riding.current',
        longestRidingStreak: '$achievements.streaks.riding.longest',
        postingStreak: '$achievements.streaks.posting.current',
        longestPostingStreak: '$achievements.streaks.posting.longest'
      }
    },
    { $sort: { ridingStreak: -1 } },
    { $limit: limit }
  ]);
};
