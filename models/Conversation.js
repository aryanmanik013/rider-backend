// models/Conversation.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  
  // Participants in the conversation
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // For group chats
  name: String,
  description: String,
  avatar: String,
  
  // For trip-based conversations (optional reference)
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  
  // Last message (denormalized for performance)
  lastMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date
  },
  
  // Unread counts per user
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  
  // Conversation settings
  settings: {
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    archivedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1, updatedAt: -1 });
conversationSchema.index({ 'lastMessage.createdAt': -1 });
conversationSchema.index({ trip: 1 });

export default mongoose.model('Conversation', conversationSchema);

