// controllers/chatController.js
import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import { getSocketInstance } from "../utils/socket.js";

// Get all conversations for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'name avatar email')
    .sort({ updatedAt: -1 });
    
    // Get unread count for user and populate lastMessage sender
    const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
      const userUnread = conv.unreadCounts.find(u => u.user.toString() === userId);
      const unreadCount = userUnread ? userUnread.count : 0;
      
      // Manually populate lastMessage sender if it exists
      let lastMessageWithSender = null;
      if (conv.lastMessage && conv.lastMessage.sender) {
        const sender = await User.findById(conv.lastMessage.sender).select('name avatar');
        lastMessageWithSender = {
          messageId: conv.lastMessage.messageId,
          content: conv.lastMessage.content,
          sender: sender ? {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar
          } : null,
          createdAt: conv.lastMessage.createdAt
        };
      }
      
      // For direct conversations, identify the other participant
      let otherParticipant = null;
      if (conv.type === 'direct' && conv.participants.length === 2) {
        const otherUser = conv.participants.find(p => p._id.toString() !== userId);
        if (otherUser) {
          otherParticipant = {
            _id: otherUser._id.toString(),
            name: otherUser.name,
            avatar: otherUser.avatar,
            email: otherUser.email
          };
        }
      }
      
      return {
        _id: conv._id.toString(),
        type: conv.type,
        participants: conv.participants.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          avatar: p.avatar,
          email: p.email
        })),
        otherParticipant, // Helper field for direct conversations
        name: conv.name,
        description: conv.description,
        avatar: conv.avatar,
        trip: conv.trip?.toString(),
        lastMessage: lastMessageWithSender,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    }));
    
    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create or get direct conversation between two users
export const getDirectConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    
    if (userId === currentUserId) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }
    
    // Validate userId exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find existing conversation
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [currentUserId, userId] }
    });
    
    // Create if doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [currentUserId, userId]
      });
    }
    
    await conversation.populate('participants', 'name avatar email');
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create group conversation
export const createGroupConversation = async (req, res) => {
  try {
    const { name, description, participants } = req.body;
    const userId = req.user._id.toString();
    
    if (!name || !participants || participants.length === 0) {
      return res.status(400).json({ message: "Name and participants required" });
    }
    
    const allParticipants = [...new Set([userId, ...participants])];
    
    const conversation = await Conversation.create({
      type: 'group',
      name,
      description,
      participants: allParticipants,
      settings: {
        admins: [userId]
      }
    });
    
    await conversation.populate('participants', 'name avatar email');
    
    res.status(201).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'text', metadata, recipientId } = req.body;
    const userId = req.user._id.toString();
    
    if (!conversationId || !content) {
      return res.status(400).json({ message: "conversationId and content required" });
    }
    
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not authorized to send messages" });
    }
    
    // Create message
    const messageData = {
      sender: userId,
      conversation: conversationId,
      content,
      type
    };
    
    if (metadata) messageData.metadata = metadata;
    if (recipientId) messageData.recipient = recipientId;
    if (conversation.trip) messageData.trip = conversation.trip;
    
    const message = await Message.create(messageData);
    await message.populate('sender', 'name avatar email');
    await message.populate('recipient', 'name avatar email');
    
    // Add isMine field for easy identification
    const messageObj = message.toObject();
    messageObj.isMine = true;
    
    // Update conversation's last message
    conversation.lastMessage = {
      messageId: message._id,
      content: message.content,
      sender: req.user._id,
      createdAt: message.createdAt
    };
    
    // Increment unread counts for other participants
    conversation.participants.forEach(p => {
      if (p.toString() !== userId) {
        const unread = conversation.unreadCounts.find(u => u.user.toString() === p.toString());
        if (unread) {
          unread.count += 1;
        } else {
          conversation.unreadCounts.push({ user: p, count: 1 });
        }
      }
    });
    
    await conversation.save();
    
    // Emit real-time socket event to conversation participants
    const io = getSocketInstance();
    if (io) {
      conversation.participants.forEach(p => {
        const isMineForUser = p.toString() === userId;
        io.to(`user_${p.toString()}`).emit('new_message', {
          _id: message._id,
          conversation: conversation._id,
          sender: {
            _id: message.sender._id,
            name: message.sender.name,
            avatar: message.sender.avatar,
            email: message.sender.email
          },
          recipient: message.recipient ? {
            _id: message.recipient._id,
            name: message.recipient.name,
            avatar: message.recipient.avatar,
            email: message.recipient.email
          } : null,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          createdAt: message.createdAt,
          isEdited: message.isEdited,
          isMine: isMineForUser
        });
      });
    }
    
    res.status(201).json(messageObj);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a conversation
export const getConversationMessages = async (req, res) => {
  try {
    // Support both :id and :conversationId parameter names
    const conversationId = req.params.conversationId || req.params.id;
    const userId = req.user._id.toString();
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }
    
    // Get total count
    const totalMessages = await Message.countDocuments({ 
      conversation: conversationId,
      isDeleted: false
    });
    
    const messages = await Message.find({ 
      conversation: conversationId,
      isDeleted: false
    })
    .populate('sender', 'name avatar email')
    .populate('recipient', 'name avatar email')
    .sort({ createdAt: -1 }) // Most recent first
    .limit(limit)
    .skip(skip);
    
    // Reset unread count for this user
    const userUnread = conversation.unreadCounts.find(u => u.user.toString() === userId);
    if (userUnread) {
      userUnread.count = 0;
    }
    await conversation.save();
    
    // Populate conversation participants
    await conversation.populate('participants', 'name avatar email');
    
    // Add isMine field to each message for easy identification
    const messagesWithIsMine = messages.map(msg => {
      const msgObj = msg.toObject();
      msgObj.isMine = msg.sender._id.toString() === userId;
      return msgObj;
    });
    
    res.json({ 
      messages: messagesWithIsMine.reverse(), // Reverse to show oldest first
      conversation,
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id.toString();
    
    if (!content) {
      return res.status(400).json({ message: "content required" });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }
    
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', 'name avatar email');
    await message.populate('recipient', 'name avatar email');
    
    // Add isMine field for easy identification
    const messageObj = message.toObject();
    messageObj.isMine = message.sender._id.toString() === userId;
    
    res.json(messageObj);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id.toString();
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }
    
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark messages as read in a conversation
export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Reset unread count
    const userUnread = conversation.unreadCounts.find(u => u.user.toString() === userId);
    if (userUnread) {
      userUnread.count = 0;
    }
    await conversation.save();
    
    // Mark all messages in conversation as read (avoid duplicates)
    await Message.updateMany(
      { 
        conversation: conversationId,
        'readBy.user': { $ne: new mongoose.Types.ObjectId(userId) }
      },
      { $push: { readBy: { user: new mongoose.Types.ObjectId(userId), readAt: new Date() } } }
    );
    
    res.json({ message: "Conversation marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add participant to group conversation
export const addParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if user is admin
    const isAdmin = conversation.settings?.admins?.some(a => a.toString() === currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add participants" });
    }
    
    if (!conversation.participants.includes(userId)) {
      conversation.participants.push(userId);
      await conversation.save();
    }
    
    await conversation.populate('participants', 'name avatar email');
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove participant from group conversation
export const removeParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const isAdmin = conversation.settings?.admins?.some(a => a.toString() === currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can remove participants" });
    }
    
    conversation.participants = conversation.participants.filter(p => p.toString() !== userId);
    await conversation.save();
    
    res.json({ message: "Participant removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single conversation by ID
export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name avatar email');
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }
    
    // Populate lastMessage sender if exists
    let lastMessageWithSender = null;
    if (conversation.lastMessage && conversation.lastMessage.sender) {
      const sender = await User.findById(conversation.lastMessage.sender).select('name avatar');
      lastMessageWithSender = {
        messageId: conversation.lastMessage.messageId,
        content: conversation.lastMessage.content,
        sender: sender ? {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar
        } : null,
        createdAt: conversation.lastMessage.createdAt
      };
    }
    
    // Get unread count
    const userUnread = conversation.unreadCounts.find(u => u.user.toString() === userId);
    const unreadCount = userUnread ? userUnread.count : 0;
    
    // For direct conversations, identify the other participant
    let otherParticipant = null;
    if (conversation.type === 'direct' && conversation.participants.length === 2) {
      const otherUser = conversation.participants.find(p => p._id.toString() !== userId);
      if (otherUser) {
        otherParticipant = {
          _id: otherUser._id.toString(),
          name: otherUser.name,
          avatar: otherUser.avatar,
          email: otherUser.email
        };
      }
    }
    
    res.json({
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        participants: conversation.participants,
        otherParticipant, // Helper field for direct conversations
        name: conversation.name,
        description: conversation.description,
        avatar: conversation.avatar,
        lastMessage: lastMessageWithSender,
        unreadCount,
        settings: conversation.settings,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mute/unmute conversation
export const muteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (!conversation.settings.mutedBy) {
      conversation.settings.mutedBy = [];
    }
    
    const isMuted = conversation.settings.mutedBy.some(u => u.toString() === userId);
    
    if (isMuted) {
      conversation.settings.mutedBy = conversation.settings.mutedBy.filter(u => u.toString() !== userId);
      await conversation.save();
      res.json({ message: "Conversation unmuted" });
    } else {
      conversation.settings.mutedBy.push(userId);
      await conversation.save();
      res.json({ message: "Conversation muted" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Archive/unarchive conversation
export const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (!conversation.settings.archivedBy) {
      conversation.settings.archivedBy = [];
    }
    
    const isArchived = conversation.settings.archivedBy.some(u => u.toString() === userId);
    
    if (isArchived) {
      conversation.settings.archivedBy = conversation.settings.archivedBy.filter(u => u.toString() !== userId);
      await conversation.save();
      res.json({ message: "Conversation unarchived" });
    } else {
      conversation.settings.archivedBy.push(userId);
      await conversation.save();
      res.json({ message: "Conversation archived" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update conversation (name, description, avatar)
export const updateConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Only group conversations can be updated
    if (conversation.type !== 'group') {
      return res.status(400).json({ message: "Only group conversations can be updated" });
    }
    
    // Check if user is admin
    const isAdmin = conversation.settings?.admins?.some(a => a.toString() === userId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can update conversation" });
    }
    
    if (name) conversation.name = name;
    if (description) conversation.description = description;
    if (avatar) conversation.avatar = avatar;
    
    await conversation.save();
    await conversation.populate('participants', 'name avatar email');
    
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Leave group conversation
export const leaveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (conversation.type !== 'group') {
      return res.status(400).json({ message: "Can only leave group conversations" });
    }
    
    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant" });
    }
    
    conversation.participants = conversation.participants.filter(p => p.toString() !== userId);
    
    // Remove from admins if user is admin
    if (conversation.settings?.admins) {
      conversation.settings.admins = conversation.settings.admins.filter(a => a.toString() !== userId);
    }
    
    await conversation.save();
    
    res.json({ message: "Left conversation successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
