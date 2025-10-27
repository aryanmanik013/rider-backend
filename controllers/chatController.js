// controllers/chatController.js
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Trip from "../models/Trip.js";

// Get all conversations for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'name avatar email')
    .populate('lastMessage.sender', 'name avatar')
    .sort({ 'lastMessage.createdAt': -1 });
    
    // Get unread count for user
    const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
      const userUnread = conv.unreadCounts.find(u => u.user.toString() === userId);
      const unreadCount = userUnread ? userUnread.count : 0;
      
      return {
        _id: conv._id,
        type: conv.type,
        participants: conv.participants,
        name: conv.name,
        description: conv.description,
        avatar: conv.avatar,
        trip: conv.trip,
        lastMessage: conv.lastMessage,
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
    
    // Update conversation's last message
    conversation.lastMessage = {
      messageId: message._id,
      content: message.content,
      sender: userId,
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
    
    res.status(201).json(message);
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
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }
    
    const messages = await Message.find({ 
      conversation: conversationId,
      isDeleted: false
    })
    .populate('sender', 'name avatar email')
    .sort({ createdAt: 1 });
    
    // Reset unread count for this user
    const userUnread = conversation.unreadCounts.find(u => u.user.toString() === userId);
    if (userUnread) {
      userUnread.count = 0;
    }
    await conversation.save();
    
    res.json({ messages, conversation });
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
    
    res.json(message);
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
    
    // Mark all messages in conversation as read
    await Message.updateMany(
      { conversation: conversationId },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
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
