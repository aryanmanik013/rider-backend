// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Conversation - messages belong to a conversation
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  
  // Trip reference (optional - for trip-based conversations)
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  
  // Recipient for direct messages
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'system'],
    default: 'text'
  },
  metadata: {
    mediaUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    location: {
      lat: Number,
      lng: Number
    },
    systemType: String
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model('Message', messageSchema);
