// controllers/friendsController.js
import User from "../models/User.js";

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if target user allows friend requests
    if (!targetUser.privacySettings.allowFriendRequests) {
      return res.status(403).json({ message: "This user does not accept friend requests" });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already friends
    const alreadyFriends = currentUser.friends.some(friend => 
      friend.user.toString() === userId
    );
    if (alreadyFriends) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check if request already sent
    const requestAlreadySent = currentUser.sentRequests.some(request => 
      request.user.toString() === userId
    );
    if (requestAlreadySent) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check if request already pending
    const requestAlreadyPending = targetUser.pendingRequests.some(request => 
      request.user.toString() === currentUserId.toString()
    );
    if (requestAlreadyPending) {
      return res.status(400).json({ message: "Friend request already pending" });
    }

    // Add to current user's sent requests
    currentUser.sentRequests.push({ user: userId });
    
    // Add to target user's pending requests
    targetUser.pendingRequests.push({ user: currentUserId });

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: "Friend request sent successfully",
      targetUser: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if request exists in pending requests
    const pendingRequestIndex = currentUser.pendingRequests.findIndex(request => 
      request.user.toString() === userId
    );

    if (pendingRequestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request found" });
    }

    // Remove from current user's pending requests
    currentUser.pendingRequests.splice(pendingRequestIndex, 1);

    // Remove from target user's sent requests
    const sentRequestIndex = targetUser.sentRequests.findIndex(request => 
      request.user.toString() === currentUserId.toString()
    );
    if (sentRequestIndex !== -1) {
      targetUser.sentRequests.splice(sentRequestIndex, 1);
    }

    // Add to both users' friends lists
    currentUser.friends.push({ user: userId });
    targetUser.friends.push({ user: currentUserId });

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: "Friend request accepted successfully",
      newFriend: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar,
        addedAt: new Date()
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from current user's pending requests
    const pendingRequestIndex = currentUser.pendingRequests.findIndex(request => 
      request.user.toString() === userId
    );

    if (pendingRequestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request found" });
    }

    currentUser.pendingRequests.splice(pendingRequestIndex, 1);

    // Remove from target user's sent requests
    const sentRequestIndex = targetUser.sentRequests.findIndex(request => 
      request.user.toString() === currentUserId.toString()
    );
    if (sentRequestIndex !== -1) {
      targetUser.sentRequests.splice(sentRequestIndex, 1);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: "Friend request rejected successfully",
      rejectedUser: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove friend
export const removeFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from current user's friends list
    const currentUserFriendIndex = currentUser.friends.findIndex(friend => 
      friend.user.toString() === userId
    );

    if (currentUserFriendIndex === -1) {
      return res.status(400).json({ message: "User is not in your friends list" });
    }

    currentUser.friends.splice(currentUserFriendIndex, 1);

    // Remove from target user's friends list
    const targetUserFriendIndex = targetUser.friends.findIndex(friend => 
      friend.user.toString() === currentUserId.toString()
    );

    if (targetUserFriendIndex !== -1) {
      targetUser.friends.splice(targetUserFriendIndex, 1);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: "Friend removed successfully",
      removedFriend: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get friends list
export const getFriendsList = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(userId)
      .populate('friends.user', 'name avatar bikes location totalTrips')
      .populate('pendingRequests.user', 'name avatar')
      .populate('sentRequests.user', 'name avatar');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check privacy settings
    if (userId !== currentUserId.toString() && !user.privacySettings.showFriendsList) {
      return res.status(403).json({ message: "User's friends list is private" });
    }

    const friends = user.friends.map(friend => ({
      _id: friend.user._id,
      name: friend.user.name,
      avatar: friend.user.avatar,
      bikes: friend.user.bikes,
      location: friend.user.location,
      totalTrips: friend.user.totalTrips,
      addedAt: friend.addedAt
    }));

    const pendingRequests = user.pendingRequests.map(request => ({
      _id: request.user._id,
      name: request.user.name,
      avatar: request.user.avatar,
      sentAt: request.sentAt
    }));

    const sentRequests = user.sentRequests.map(request => ({
      _id: request.user._id,
      name: request.user.name,
      avatar: request.user.avatar,
      sentAt: request.sentAt
    }));

    res.json({
      friends,
      pendingRequests: userId === currentUserId.toString() ? pendingRequests : [],
      sentRequests: userId === currentUserId.toString() ? sentRequests : [],
      totalFriends: friends.length,
      totalPendingRequests: pendingRequests.length,
      totalSentRequests: sentRequests.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get mutual friends
export const getMutualFriends = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId)
      .populate('friends.user', 'name avatar');
    
    const targetUser = await User.findById(userId)
      .populate('friends.user', 'name avatar');

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check privacy settings
    if (!targetUser.privacySettings.showMutualFriends) {
      return res.status(403).json({ message: "User's mutual friends are private" });
    }

    // Find mutual friends
    const currentUserFriends = currentUser.friends.map(friend => friend.user._id.toString());
    const targetUserFriends = targetUser.friends.map(friend => friend.user._id.toString());

    const mutualFriendIds = currentUserFriends.filter(friendId => 
      targetUserFriends.includes(friendId)
    );

    const mutualFriends = targetUser.friends
      .filter(friend => mutualFriendIds.includes(friend.user._id.toString()))
      .map(friend => ({
        _id: friend.user._id,
        name: friend.user.name,
        avatar: friend.user.avatar,
        addedAt: friend.addedAt
      }));

    res.json({
      mutualFriends,
      totalMutualFriends: mutualFriends.length,
      targetUser: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get friend suggestions
export const getFriendSuggestions = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { limit = 10 } = req.query;

    const currentUser = await User.findById(currentUserId)
      .populate('friends.user', '_id')
      .populate('sentRequests.user', '_id')
      .populate('pendingRequests.user', '_id');

    // Get IDs of users to exclude (friends, sent requests, pending requests, self)
    const excludeIds = [
      currentUserId.toString(),
      ...currentUser.friends.map(friend => friend.user._id.toString()),
      ...currentUser.sentRequests.map(request => request.user._id.toString()),
      ...currentUser.pendingRequests.map(request => request.user._id.toString())
    ];

    // Find users with mutual friends (friend suggestions)
    const suggestions = await User.find({
      _id: { $nin: excludeIds },
      'privacySettings.allowFriendRequests': true
    })
      .populate('friends.user', '_id')
      .limit(parseInt(limit) * 2) // Get more to filter
      .select('name avatar bikes location totalTrips friends');

    // Calculate mutual friends count and filter
    const suggestionsWithMutualCount = suggestions.map(user => {
      const userFriends = user.friends.map(friend => friend.user._id.toString());
      const mutualCount = currentUser.friends.filter(friend => 
        userFriends.includes(friend.user._id.toString())
      ).length;

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        bikes: user.bikes,
        location: user.location,
        totalTrips: user.totalTrips,
        mutualFriendsCount: mutualCount
      };
    })
    .filter(user => user.mutualFriendsCount > 0) // Only show users with mutual friends
    .sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount) // Sort by mutual friends count
    .slice(0, parseInt(limit));

    res.json({
      suggestions: suggestionsWithMutualCount,
      totalSuggestions: suggestionsWithMutualCount.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { showFriendsList, showMutualFriends, allowFriendRequests, showOnlineStatus } = req.body;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update privacy settings
    if (showFriendsList !== undefined) user.privacySettings.showFriendsList = showFriendsList;
    if (showMutualFriends !== undefined) user.privacySettings.showMutualFriends = showMutualFriends;
    if (allowFriendRequests !== undefined) user.privacySettings.allowFriendRequests = allowFriendRequests;
    if (showOnlineStatus !== undefined) user.privacySettings.showOnlineStatus = showOnlineStatus;

    await user.save();

    res.json({
      message: "Privacy settings updated successfully",
      privacySettings: user.privacySettings
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel sent friend request
export const cancelFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from current user's sent requests
    const sentRequestIndex = currentUser.sentRequests.findIndex(request => 
      request.user.toString() === userId
    );

    if (sentRequestIndex === -1) {
      return res.status(400).json({ message: "No sent friend request found" });
    }

    currentUser.sentRequests.splice(sentRequestIndex, 1);

    // Remove from target user's pending requests
    const pendingRequestIndex = targetUser.pendingRequests.findIndex(request => 
      request.user.toString() === currentUserId.toString()
    );

    if (pendingRequestIndex !== -1) {
      targetUser.pendingRequests.splice(pendingRequestIndex, 1);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: "Friend request cancelled successfully",
      cancelledUser: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
